import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import ProductCard from '../components/ProductCard';
import { Breadcrumbs, EmptyState, ProductImage, Stepper } from '../components/ui';
import { TIPOS, categoriaById } from '../data/seed';
import { money } from '../utils/format';

// RF-05: detalle del producto con existencias, cantidad y productos relacionados
export default function ProductDetailPage() {
    const { id } = useParams();
    const { products, productsLoaded, qtyOf, add } = useCart();
    const [qty, setQty] = useState(1);
    const [view, setView] = useState('cut');

    useEffect(() => {
        setQty(1);
        setView('cut');
    }, [id]);

    const p = products.find((x) => x.id_producto === Number(id));

    if (!productsLoaded) return <div className="view" />;

    if (!p) {
        return (
            <div className="view">
                <section className="wrap pagehead">
                    <Breadcrumbs items={[['/', 'Inicio'], ['/catalogo', 'Catálogo'], ['', 'No disponible']]} />
                    <EmptyState
                        title="Producto no disponible"
                        style={{ marginBlock: '24px 80px' }}
                        action={<Link className="btn btn-primary" to="/catalogo">Volver al catálogo</Link>}
                    >
                        Este producto ya no está en el catálogo.
                    </EmptyState>
                </section>
            </div>
        );
    }

    const c = categoriaById(p.categoria);
    const out = p.stock <= 0;
    const inCart = qtyOf(p.id_producto);
    const room = Math.max(0, p.stock - inCart);
    const q = Math.min(qty, Math.max(1, room));
    const gallery = p.foto ? view : 'cut';
    const related = products.filter((x) => x.categoria === p.categoria && x.id_producto !== p.id_producto).slice(0, 4);

    function addToCart() {
        add(p, q);
        setQty(1);
    }

    let stockLine;
    if (out) stockLine = <p className="stockline out"><i />Agotado. Este producto no tiene unidades disponibles por ahora.</p>;
    else if (p.stock <= 3) stockLine = <p className="stockline low"><i />Quedan {p.stock} unidades</p>;
    else stockLine = <p className="stockline"><i />{p.stock} unidades disponibles</p>;

    return (
        <div className="view">
            <section className="wrap pagehead">
                <Breadcrumbs items={[['/', 'Inicio'], ['/catalogo', 'Catálogo'], ['', p.nombre]]} />
            </section>

            <section className="wrap pgrid">
                <div className="gal">
                    <div className={`media${out ? ' out' : ''}`}>
                        <ProductImage product={p} photo={gallery === 'foto'} lazy={false} />
                        {out && <span className="flag">Agotado</span>}
                    </div>
                    {p.foto && (
                        <div className="thumbs" role="group" aria-label="Vistas del producto">
                            <button className="tbtn" aria-pressed={gallery === 'cut'} aria-label="Ver el producto" onClick={() => setView('cut')}>
                                <ProductImage product={p} decorative />
                            </button>
                            <button className="tbtn" aria-pressed={gallery === 'foto'} aria-label="Ver la foto original" onClick={() => setView('foto')}>
                                <ProductImage product={p} photo decorative />
                            </button>
                        </div>
                    )}
                </div>

                <div className="pinfo">
                    <div>
                        <p className="ptype">{TIPOS[p.categoria] || c.nombre}</p>
                        <h1 className="h1">{p.nombre}</h1>
                    </div>
                    <p className="pricebig">{money(p.precio)}</p>
                    {stockLine}
                    <p className="pdesc">{p.descripcion}</p>

                    {!out && (
                        <div>
                            <p className="optlabel">Cantidad</p>
                            <div className="buyrow">
                                <Stepper
                                    value={q}
                                    canDec={q > 1}
                                    canInc={q < room}
                                    onDec={() => setQty(Math.max(1, q - 1))}
                                    onInc={() => setQty(q + 1)}
                                />
                                <button className="btn btn-primary" disabled={room <= 0} onClick={addToCart} style={{ flex: '1 1 220px' }}>
                                    Agregar al carrito
                                </button>
                            </div>
                            {inCart > 0 && (
                                <p className="fine" style={{ marginTop: 10 }}>
                                    Ya tienes {inCart} en el carrito.{room <= 0 && ' Agregaste todas las unidades disponibles.'}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="specs">
                        <div><span>Categoría</span><b>{c.nombre}</b></div>
                        <div><span>Referencia</span><b>P{String(p.id_producto).padStart(2, '0')}</b></div>
                        <div><span>Pago</span><b>Con tu cuenta, al finalizar</b></div>
                    </div>
                    <p className="fine">Puedes agregar al carrito sin cuenta. Para pagar te pediremos iniciar sesión.</p>
                </div>
            </section>

            {related.length > 0 && (
                <section className="sec sec-tight">
                    <div className="wrap">
                        <div className="chead">
                            <h2 className="h2" style={{ fontSize: 'clamp(1.8rem,3.4vw,2.6rem)' }}>Más en {c.nombre}</h2>
                            <Link className="btn btn-outline" to={`/catalogo?categoria=${c.id}`}>Ver la categoría</Link>
                        </div>
                        <div className="grid g4">
                            {related.map((x, i) => <ProductCard key={x.id_producto} product={x} index={i} />)}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
