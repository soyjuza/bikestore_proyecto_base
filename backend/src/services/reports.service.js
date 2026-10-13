const pool = require("../config/db");
const AppError = require("../utils/AppError");
const notImplemented = require("../utils/notImplemented");

/* RF-21..26: tablero del administrador e informes exportables.
   Formato que espera el frontend en getDashboard:
   {
     ventas, pedidosCount, unidades,
     meses:       [{ mes: 'YYYY-MM', etiqueta: 'ago 26', valor }],
     masVendidos: [{ nombre, cantidad, valor }]            (top 5 por unidades),
     pedidos:     [{ numero, fecha, cliente, email, total }] (más recientes primero),
     alertas:     [{ id_producto, nombre, stock }]          (activos con stock <= 3)
   }
   Si categoria !== 'todas', solo cuentan las líneas de esa categoría.

   TODO getDashboard({ desde, hasta, categoria }): consultas con SUM/COUNT/GROUP BY sobre pedidos y pedido_detalle.
   TODO buildExcel(filters): usar exceljs -> workbook con hojas «Resumen», «Más vendidos» y «Pedidos»; devolver
        await workbook.xlsx.writeBuffer().
   TODO buildPdf(filters): usar pdfkit -> documento con los KPIs y las tablas; devolver un Buffer. */
async function getDashboard(filters) {
  notImplemented("Tablero de control");
}

async function buildExcel(filters) {
  notImplemented("Exportar Excel");
}

async function buildPdf(filters) {
  notImplemented("Exportar PDF");
}

module.exports = { getDashboard, buildExcel, buildPdf };
