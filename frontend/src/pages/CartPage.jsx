import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import CartItem from '../components/CartItem';
import { Breadcrumbs, EmptyState } from '../components/ui';
import { IconLock, IconOk } from '../components/Icons';
import { money, plural } from '../utils/format';

// RF-06..08: ver, modificar y quitar productos del carrito
export default function CartPage() {
    const { user } = useAuth();
    const { lines, count, total, setQty, remove, restore } = useCart();
    const toast = useToast();

    function removeLine(line) {
        const removed = remove(line.id_producto);
        toast.show(`${line.product.nombre} se quitó del carrito`, 'Deshacer', () => restore(removed));
    }

    const head = (
        <section className="wrap pagehead">
            <Breadcrumbs items={[['/', 'Inicio'], ['/carrito', 'Carrito']]} />
            <h1 className="h1">Tu carrito</h1>
            <p className="lead">{count} {plural(count, 'producto seleccionado', 'productos seleccionados')}.</p>
        </section>
    );

    if (!lines.length) {
        return (
            <div className="view">
                {head}
                <section className="wrap" style={{ paddingBlock: '24px 96px' }}>
                    <EmptyState title="Tu carrito está vacío" action={<Link className="btn btn-primary" to="/catalogo">Ir al catálogo</Link>}>
                        Agrega bicicletas o accesorios desde el catálogo o desde el detalle de un producto.
                    </EmptyState>
                </section>
            </div>
        );
    }

    return (
        <div className="view">
            {head}
            <section className="wrap cgrid">
                <div>
                    {user ? (
                        <div className="box note ok">
                            <IconOk />
                            <span>Tu carrito queda guardado en tu cuenta ({user.email}). Si sales, lo recuperas al volver a iniciar sesión.</span>
                        </div>
                    ) : (
                        <div className="box note">
                            <IconLock />
                            <span>Estás comprando sin cuenta. <Link className="linkbtn" to="/ingresar" style={{ minHeight: 0 }}>Inicia sesión</Link> para guardar el carrito y poder pagar.</span>
                        </div>
                    )}
                    <div className="clines">
                        {lines.map((line) => (
                            <CartItem
                                key={line.id_producto}
                                line={line}
                                onQty={(n) => setQty(line.id_producto, n)}
                                onRemove={() => removeLine(line)}
                            />
                        ))}
                    </div>
                    <div style={{ marginTop: 18 }}>
                        <Link className="linkbtn" to="/catalogo">Seguir comprando</Link>
                    </div>
                </div>

                <aside className="box sum" aria-label="Valores del carrito">
                    <h2>Resumen</h2>
                    {lines.map((l) => (
                        <div className="kv" key={l.id_producto}>
                            <span>{l.cantidad} × {l.product.nombre}</span>
                            <strong>{money(l.product.precio * l.cantidad)}</strong>
                        </div>
                    ))}
                    <hr className="hr" />
                    <div className="kv tot"><span>Total</span><strong>{money(total)}</strong></div>
                    <Link className="btn btn-primary btn-block" to="/pago">Ver resumen y pagar</Link>
                    {!user && <p className="fine" style={{ textAlign: 'center' }}>Te pediremos iniciar sesión antes de pagar.</p>}
                </aside>
            </section>
        </div>
    );
}
