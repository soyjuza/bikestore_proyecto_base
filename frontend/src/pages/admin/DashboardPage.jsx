import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { EmptyState } from '../../components/ui';
import { IconWarn } from '../../components/Icons';
import { CATEGORIAS, categoriaById } from '../../data/seed';
import { exportExcel, getDashboard } from '../../services/reports.service';
import { dateCO, money, plural, today } from '../../utils/format';

// RF-21..26: tablero con ventas, pedidos, más vendidos, alertas de inventario e informe exportable
export default function DashboardPage() {
    const toast = useToast();
    const [filters, setFilters] = useState({ desde: '2026-08-01', hasta: today(), categoria: 'todas' });
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        getDashboard(filters).then(
            (r) => alive && (setReport(r), setError('')),
            (err) => alive && setError(err.message)
        );
        return () => {
            alive = false;
        };
    }, [filters]);

    function change(e) {
        const next = { ...filters, [e.target.name]: e.target.value };
        if (!next.desde || !next.hasta) return;
        if (next.desde > next.hasta) {
            toast.show('La fecha inicial no puede ser posterior a la final');
            return;
        }
        setFilters(next);
    }

    const catName = filters.categoria === 'todas' ? 'Todas' : categoriaById(filters.categoria).nombre;

    async function toExcel() {
        try {
            await exportExcel(report, filters, catName);
            toast.show('Informe descargado. Ábrelo con Excel.');
        } catch (err) {
            toast.show(err.message);
        }
    }

    const R = report;
    const maxM = R ? Math.max(1, ...R.meses.map((m) => m.valor)) : 1;
    const maxT = R ? Math.max(1, ...R.masVendidos.map((t) => t.cantidad)) : 1;

    return (
        <>
            <div className="ahead">
                <div>
                    <h1>Tablero de control</h1>
                    <p>Ventas, pedidos y productos más vendidos de la tienda.</p>
                </div>
            </div>

            <form className="box filters no-print" onSubmit={(e) => e.preventDefault()}>
                <div className="field">
                    <label htmlFor="d-from">Desde</label>
                    <input className="inp" type="date" id="d-from" name="desde" value={filters.desde} onChange={change} />
                </div>
                <div className="field">
                    <label htmlFor="d-to">Hasta</label>
                    <input className="inp" type="date" id="d-to" name="hasta" value={filters.hasta} onChange={change} />
                </div>
                <div className="field">
                    <label htmlFor="d-cat">Categoría</label>
                    <select className="sel" id="d-cat" name="categoria" value={filters.categoria} onChange={change}>
                        <option value="todas">Todas</option>
                        {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="acts">
                    <button type="button" className="btn btn-outline btn-sm" onClick={toExcel} disabled={!R}>Exportar Excel</button>
                    <button type="button" className="btn btn-dark btn-sm" onClick={() => window.print()}>Exportar PDF</button>
                </div>
            </form>

            {error && <p className="meta" role="alert">{error}</p>}

            <p className="tcount">Periodo del {dateCO(filters.desde)} al {dateCO(filters.hasta)}, categoría: {catName.toLowerCase()}</p>

            {R && (
                <>
                    <div className="kpis">
                        <div className="box kpi"><span>Ventas totales</span><strong>{money(R.ventas)}</strong><small>Suma de los pedidos pagados</small></div>
                        <div className="box kpi"><span>Pedidos</span><strong>{R.pedidosCount}</strong><small>Pedidos con pago exitoso</small></div>
                        <div className="box kpi"><span>Unidades vendidas</span><strong>{R.unidades}</strong><small>Productos despachados</small></div>
                    </div>

                    <div className="panels">
                        <div className="box panel">
                            <h3>Ventas por mes</h3>
                            <p className="sub">Pasa el cursor sobre cada barra para ver el valor.</p>
                            {R.ventas ? (
                                <>
                                    <div className="cols">
                                        {R.meses.map((m) => (
                                            <div key={m.mes} className="col" tabIndex={0} style={{ '--h': `${((m.valor / maxM) * 100).toFixed(1)}%` }} aria-label={`${m.etiqueta}: ${money(m.valor)}`}>
                                                <span className="tip">{m.etiqueta}: {money(m.valor)}</span><i />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="xl">{R.meses.map((m) => <span key={m.mes}>{m.etiqueta}</span>)}</div>
                                </>
                            ) : <EmptyState style={{ padding: 32 }}>Sin ventas en este periodo.</EmptyState>}
                        </div>

                        <div className="box panel">
                            <h3>Productos más vendidos</h3>
                            <p className="sub">Unidades vendidas en el periodo.</p>
                            {R.masVendidos.length ? (
                                <ol className="hbars">
                                    {R.masVendidos.map((t) => (
                                        <li className="hb" key={t.nombre}>
                                            <span className="nm">{t.nombre}</span>
                                            <span className="vl">{t.cantidad} u., {money(t.valor)}</span>
                                            <span className="tr"><i style={{ '--w': `${((t.cantidad / maxT) * 100).toFixed(1)}%` }} /></span>
                                        </li>
                                    ))}
                                </ol>
                            ) : <EmptyState style={{ padding: 32 }}>Sin ventas en este periodo.</EmptyState>}
                        </div>
                    </div>

                    <div className="panels">
                        <div className="box panel">
                            <h3>Pedidos del periodo</h3>
                            <p className="sub">{R.pedidos.length} {plural(R.pedidos.length, 'pedido', 'pedidos')}.</p>
                            {R.pedidos.length ? (
                                <>
                                    <table className="tbl">
                                        <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th className="num">Total</th></tr></thead>
                                        <tbody>
                                            {R.pedidos.slice(0, 8).map((o) => (
                                                <tr key={o.numero}>
                                                    <td className="first" data-l="Número"><b>{o.numero}</b></td>
                                                    <td data-l="Fecha">{dateCO(o.fecha)}</td>
                                                    <td data-l="Cliente">{o.cliente}</td>
                                                    <td className="num" data-l="Total">{money(o.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {R.pedidos.length > 8 && <p className="tcount" style={{ marginTop: 12 }}>Se muestran los 8 más recientes. El informe exportado trae todos.</p>}
                                </>
                            ) : <EmptyState style={{ padding: 32 }}>No hay pedidos en este periodo.</EmptyState>}
                        </div>

                        <div className="box panel">
                            <h3>Alertas de inventario</h3>
                            <p className="sub">Productos activos agotados o con 3 unidades o menos.</p>
                            {R.alertas.length ? (
                                <div className="alerts">
                                    {R.alertas.map((p) => {
                                        const out = p.stock <= 0;
                                        return (
                                            <div key={p.id_producto} className={`al ${out ? 'crit' : 'warn'}`}>
                                                <IconWarn />
                                                <span className="lab">{out ? 'Agotado' : 'Stock bajo'}</span>
                                                <span>{p.nombre}</span>
                                                <span>{p.stock} u.</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <p className="meta">Todo el inventario está por encima de 3 unidades.</p>}
                            <Link className="linkbtn no-print" to="/admin/productos" style={{ marginTop: 10 }}>Actualizar existencias</Link>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
