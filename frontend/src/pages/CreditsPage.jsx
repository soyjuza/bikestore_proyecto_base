import { Breadcrumbs, ProductImage } from '../components/ui';
import { CREDITOS, SEED_PRODUCTOS } from '../data/seed';

// Las licencias libres de Wikimedia Commons piden nombrar al autor de cada foto.
export default function CreditsPage() {
    return (
        <div className="view">
            <section className="wrap pagehead">
                <Breadcrumbs items={[['/', 'Inicio'], ['/creditos', 'Créditos de las fotos']]} />
                <h1 className="h1">Créditos de las fotos</h1>
                <p className="lead">
                    Las fotos de los productos son reales y vienen de Wikimedia Commons, con licencias libres que piden nombrar al autor.
                    En la tienda se muestran sin fondo; la foto original se ve en el detalle de cada producto.
                </p>
            </section>
            <section className="wrap" style={{ paddingBlock: '28px 96px' }}>
                <p className="fine" style={{ marginBottom: 14 }}>
                    Foto de la portada: Valle del Cocora, de Ricardo Gonzalez Arango, licencia CC BY-SA 4.0.{' '}
                    <a className="linkbtn" style={{ minHeight: 0 }} href="https://commons.wikimedia.org/wiki/File:Cocora_Valley.jpg" target="_blank" rel="noopener noreferrer">Ver en Commons</a>
                </p>
                <div className="box">
                    <table className="tbl">
                        <thead><tr><th>Producto</th><th>Autor</th><th>Licencia</th><th className="num">Fuente</th></tr></thead>
                        <tbody>
                            {SEED_PRODUCTOS.map((p) => {
                                const c = CREDITOS[p.id_producto];
                                if (!c) return null;
                                return (
                                    <tr key={p.id_producto}>
                                        <td className="first" data-l="Producto">
                                            <div className="who"><span className="thumb"><ProductImage product={p} decorative /></span><b>{p.nombre}</b></div>
                                        </td>
                                        <td data-l="Autor">{c.author}</td>
                                        <td data-l="Licencia">{c.license}</td>
                                        <td className="num" data-l="Fuente">
                                            <a className="linkbtn" href={c.page} target="_blank" rel="noopener noreferrer">Ver en Commons</a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
