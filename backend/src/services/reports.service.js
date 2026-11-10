const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const { texto, esFecha } = require("../utils/validar");

/* RF-21..26: tablero del administrador e informes exportables.
   Formato de getDashboard:
   {
     ventas, pedidosCount, unidades,
     meses:       [{ mes: 'YYYY-MM', etiqueta: 'ago 26', valor }],
     masVendidos: [{ nombre, cantidad, valor }]            (top 5 por unidades),
     pedidos:     [{ numero, fecha, cliente, email, total }] (más recientes primero),
     alertas:     [{ id_producto, nombre, stock }]          (activos con stock <= 3)
   }
   Si categoria !== 'todas', solo cuentan las líneas de esa categoría.
   Los carritos también viven en pedidos, por eso todas las consultas llevan estado <> 'Carrito'. */

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const STOCK_BAJO = 3;

// RF-25: revisa el periodo y la categoría antes de consultar
async function validarFiltros(filters) {
  const { desde, hasta } = filters;
  const categoria = texto(filters.categoria) || "todas";

  if (!esFecha(desde) || !esFecha(hasta)) {
    throw new AppError("Indique el periodo del informe con fechas válidas (AAAA-MM-DD).", 400);
  }
  if (desde > hasta) {
    throw new AppError("La fecha inicial no puede ser posterior a la final.", 400);
  }

  let categoriaNombre = "Todas";
  if (categoria !== "todas") {
    const [rows] = await pool.execute("SELECT nombre FROM categorias WHERE id_categoria = ?", [categoria]);
    if (!rows.length) {
      throw new AppError("La categoría no existe.", 400);
    }
    categoriaNombre = rows[0].nombre;
  }

  return { desde, hasta, categoria, categoriaNombre };
}

// Lista de meses entre las dos fechas, cada uno con sus ventas (0 si no hubo)
function mesesDelPeriodo(desde, hasta, ventasPorMes) {
  const meses = [];
  let anio = Number(desde.slice(0, 4));
  let mes = Number(desde.slice(5, 7));
  const fin = hasta.slice(0, 7);

  while (meses.length < 14) {
    const clave = `${anio}-${String(mes).padStart(2, "0")}`;
    if (clave > fin) break;
    meses.push({
      mes: clave,
      etiqueta: `${MES[mes - 1]} ${String(anio).slice(2)}`,
      valor: ventasPorMes[clave] || 0,
    });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }

  return meses;
}

async function getDashboard(filters) {
  const { desde, hasta, categoria } = await validarFiltros(filters);

  // líneas vendidas en el periodo (y de la categoría, si se pidió una)
  const lineas = `
      FROM pedidos p
      JOIN pedido_detalle d ON d.id_pedido = p.id_pedido
      JOIN productos pr ON pr.id_producto = d.id_producto
     WHERE p.estado <> 'Carrito'
       AND p.fecha >= ? AND p.fecha < DATE_ADD(?, INTERVAL 1 DAY)
       ${categoria === "todas" ? "" : "AND pr.categoria = ?"}`;
  const params = categoria === "todas" ? [desde, hasta] : [desde, hasta, categoria];

  // RF-22 y RF-24
  const [[totales]] = await pool.execute(
    `SELECT COALESCE(SUM(d.precio * d.cantidad), 0) AS ventas,
            COUNT(DISTINCT p.id_pedido) AS pedidosCount,
            COALESCE(SUM(d.cantidad), 0) AS unidades
     ${lineas}`,
    params,
  );

  const [porMes] = await pool.execute(
    `SELECT DATE_FORMAT(p.fecha, '%Y-%m') AS mes, SUM(d.precio * d.cantidad) AS valor
     ${lineas}
     GROUP BY mes`,
    params,
  );

  // RF-23
  const [masVendidos] = await pool.execute(
    `SELECT pr.nombre, SUM(d.cantidad) AS cantidad, SUM(d.precio * d.cantidad) AS valor
     ${lineas}
     GROUP BY pr.id_producto, pr.nombre
     ORDER BY cantidad DESC, valor DESC
     LIMIT 5`,
    params,
  );

  const [pedidos] = await pool.execute(
    `SELECT p.numero, p.fecha, u.nombre AS cliente, u.email, p.total
       FROM pedidos p
       JOIN usuarios u ON u.id_usuario = p.id_usuario
      WHERE p.id_pedido IN (SELECT DISTINCT p.id_pedido ${lineas})
      ORDER BY p.fecha DESC, p.id_pedido DESC`,
    params,
  );

  // RF-21: alertas de inventario
  const [alertas] = await pool.execute(
    "SELECT id_producto, nombre, stock FROM productos WHERE activo = 1 AND stock <= ? ORDER BY stock, id_producto",
    [STOCK_BAJO],
  );

  const ventasPorMes = {};
  porMes.forEach((m) => {
    ventasPorMes[m.mes] = Number(m.valor);
  });

  return {
    ventas: Number(totales.ventas),
    pedidosCount: Number(totales.pedidosCount),
    unidades: Number(totales.unidades),
    meses: mesesDelPeriodo(desde, hasta, ventasPorMes),
    masVendidos: masVendidos.map((m) => ({ nombre: m.nombre, cantidad: Number(m.cantidad), valor: Number(m.valor) })),
    pedidos: pedidos.map((p) => ({ ...p, total: Number(p.total) })),
    alertas,
  };
}

function fechaCO(fecha) {
  const [anio, mes, dia] = String(fecha).slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

function pesos(valor) {
  return "$" + String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// RF-26: informe en Excel con tres hojas
async function buildExcel(filters) {
  const filtros = await validarFiltros(filters);
  const informe = await getDashboard(filtros);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BikeStore";
  workbook.created = new Date();

  const resumen = workbook.addWorksheet("Resumen");
  resumen.columns = [{ width: 24 }, { width: 28 }];
  resumen.addRow(["Informe BikeStore"]).font = { bold: true, size: 14 };
  resumen.addRow(["Periodo", `${fechaCO(filtros.desde)} a ${fechaCO(filtros.hasta)}`]);
  resumen.addRow(["Categoría", filtros.categoriaNombre]);
  resumen.addRow([]);
  resumen.addRow(["Ventas totales", informe.ventas]).getCell(2).numFmt = '"$"#,##0';
  resumen.addRow(["Pedidos", informe.pedidosCount]);
  resumen.addRow(["Unidades vendidas", informe.unidades]);

  const vendidos = workbook.addWorksheet("Más vendidos");
  vendidos.columns = [
    { header: "Producto", key: "nombre", width: 36 },
    { header: "Unidades", key: "cantidad", width: 12 },
    { header: "Valor", key: "valor", width: 16, style: { numFmt: '"$"#,##0' } },
  ];
  vendidos.getRow(1).font = { bold: true };
  vendidos.addRows(informe.masVendidos);

  const pedidos = workbook.addWorksheet("Pedidos");
  pedidos.columns = [
    { header: "Número", key: "numero", width: 16 },
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Cliente", key: "cliente", width: 28 },
    { header: "Correo", key: "email", width: 30 },
    { header: "Total", key: "total", width: 16, style: { numFmt: '"$"#,##0' } },
  ];
  pedidos.getRow(1).font = { bold: true };
  pedidos.addRows(informe.pedidos.map((p) => ({ ...p, fecha: fechaCO(p.fecha) })));

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Dibuja una tabla sencilla en el PDF: una fila por renglón, con salto de página si no cabe
function tablaPdf(doc, columnas, filas) {
  const x0 = doc.page.margins.left;
  const fila = (celdas, negrita) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 20) doc.addPage();
    const y = doc.y;
    let x = x0;
    doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    celdas.forEach((celda, i) => {
      doc.text(String(celda ?? ""), x, y, {
        width: columnas[i].ancho - 6,
        align: columnas[i].derecha ? "right" : "left",
        lineBreak: false,
        ellipsis: true,
      });
      x += columnas[i].ancho;
    });
    doc.y = y + 15;
  };

  fila(columnas.map((c) => c.titulo), true);
  filas.forEach((f) => fila(f, false));
  doc.x = x0;
  doc.moveDown();
}

// RF-26: el mismo informe en PDF
async function buildPdf(filters) {
  const filtros = await validarFiltros(filters);
  const informe = await getDashboard(filtros);

  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const partes = [];
  doc.on("data", (parte) => partes.push(parte));
  const terminado = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });

  doc.font("Helvetica-Bold").fontSize(18).text("Informe BikeStore");
  doc.font("Helvetica").fontSize(10)
    .text(`Periodo: ${fechaCO(filtros.desde)} a ${fechaCO(filtros.hasta)}`)
    .text(`Categoría: ${filtros.categoriaNombre}`);
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Resumen");
  doc.font("Helvetica").fontSize(10)
    .text(`Ventas totales: ${pesos(informe.ventas)}`)
    .text(`Pedidos: ${informe.pedidosCount}`)
    .text(`Unidades vendidas: ${informe.unidades}`);
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Productos más vendidos");
  doc.moveDown(0.5);
  tablaPdf(
    doc,
    [{ titulo: "Producto", ancho: 300 }, { titulo: "Unidades", ancho: 80, derecha: true }, { titulo: "Valor", ancho: 130, derecha: true }],
    informe.masVendidos.map((m) => [m.nombre, m.cantidad, pesos(m.valor)]),
  );

  doc.font("Helvetica-Bold").fontSize(12).text("Pedidos del periodo");
  doc.moveDown(0.5);
  tablaPdf(
    doc,
    [
      { titulo: "Número", ancho: 95 },
      { titulo: "Fecha", ancho: 70 },
      { titulo: "Cliente", ancho: 135 },
      { titulo: "Correo", ancho: 130 },
      { titulo: "Total", ancho: 80, derecha: true },
    ],
    informe.pedidos.map((p) => [p.numero, fechaCO(p.fecha), p.cliente, p.email, pesos(p.total)]),
  );

  doc.end();
  return terminado;
}

module.exports = { getDashboard, buildExcel, buildPdf };
