import { Link, useOutletContext } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { EmptyState, ProductImage } from '../../components/ui';
import { ESTADOS, orderStep } from './orderStatus';
import { dateCO, money, plural } from '../../utils/format';

function OrderThumbs({ order, products }) {
    const items = order.items;
    return (
        <span className="othumbs">
            {items.slice(0, 3).map((l) => (
                <span className="thumb" key={l.id_producto}>
                    <ProductImage product={products.find((p) => p.id_producto === l.id_producto) || l} decorative />
                </span>
            ))}
            {items.length > 3 && <span className="thumb more">+{items.length - 3}</span>}
        </span>
    );
}

export default function MyOrdersPage() {
    const { orders } = useOutletContext();
    const { products } = useCart();

    if (!orders) return <h2 className="acc-h">Mis pedidos</h2>;

    if (!orders.length) {
        return (
            <>
                <h2 className="acc-h">Mis pedidos</h2>
                <EmptyState title="Aún no tienes pedidos" action={<Link className="btn btn-primary" to="/catalogo">Ir al catálogo</Link>}>
                    Cuando pagues una compra, aquí verás su número, su estado y lo que pediste.
                </EmptyState>
            </>
        );
    }

    const total = orders.reduce((a, o) => a + o.total, 0);

    return (
        <>
            <div className="acc-top">
                <h2 className="acc-h">Mis pedidos</h2>
                <p className="meta">{orders.length} {plural(orders.length, 'pedido', 'pedidos')} por {money(total)} en total</p>
            </div>
            <ul className="olist">
                {orders.map((o) => {
                    const n = o.items.reduce((a, l) => a + l.cantidad, 0);
                    const k = orderStep(o);
                    return (
                        <li key={o.numero}>
                            <Link className="orow" to={`/cuenta/pedido/${o.numero}`}>
                                <OrderThumbs order={o} products={products} />
                                <span className="omain"><b>{o.numero}</b><small>{dateCO(o.fecha)}, {n} {plural(n, 'producto', 'productos')}</small></span>
                                <span className={`st ${k === 3 ? 'on' : 'low'}`}>{ESTADOS[k]}</span>
                                <span className="ototal">{money(o.total)}</span>
                                <span className="ogo" aria-hidden="true">Ver</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
