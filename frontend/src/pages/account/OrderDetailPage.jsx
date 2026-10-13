import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { EmptyState, ProductImage } from '../../components/ui';
import { getMyOrder } from '../../services/orders.service';
import { ESTADOS, orderStep } from './orderStatus';
import { dateCO, money } from '../../utils/format';

export default function OrderDetailPage() {
    const { numero } = useParams();
    const { products } = useCart();
    const [order, setOrder] = useState(undefined);

    useEffect(() => {
        let alive = true;
        getMyOrder(numero).then((o) => alive && setOrder(o), () => alive && setOrder(null));
        return () => {
            alive = false;
        };
    }, [numero]);

    if (order === undefined) return null;

    if (!order) {
        return (
            <EmptyState title="Pedido no encontrado" action={<Link className="btn btn-primary" to="/cuenta">Volver a mis pedidos</Link>}>
                Ese número no corresponde a ninguno de tus pedidos.
            </EmptyState>
        );
    }

    const k = orderStep(order);

    return (
        <>
            <Link className="linkbtn" to="/cuenta" style={{ marginBottom: 10 }}>Volver a mis pedidos</Link>
            <div className="acc-top">
                <h2 className="acc-h">Pedido {order.numero}</h2>
                <p className="meta">Pagado el {dateCO(order.fecha)}</p>
            </div>
            <ol className="track">
                {ESTADOS.map((e, i) => (
                    <li key={e} className={i < k ? 'done' : i === k ? 'on' : ''} aria-current={i === k ? 'step' : undefined}>
                        <i /><span>{e}</span>
                    </li>
                ))}
            </ol>
            <div className="clines" style={{ marginTop: 28 }}>
                {order.items.map((l) => {
                    const p = products.find((x) => x.id_producto === l.id_producto);
                    return (
                        <article className="crow oline" key={l.id_producto}>
                            {p
                                ? <Link className="media" to={`/producto/${p.id_producto}`} aria-label={`Ver ${l.nombre}`}><ProductImage product={p} decorative /></Link>
                                : <span className="media" />}
                            <div>
                                <h3>{p ? <Link to={`/producto/${p.id_producto}`}>{l.nombre}</Link> : l.nombre}</h3>
                                <p className="meta">{l.cantidad} × {money(l.precio)}</p>
                            </div>
                            <div className="lp"><strong>{money(l.precio * l.cantidad)}</strong></div>
                        </article>
                    );
                })}
            </div>
            <div className="odet">
                <div><p className="optlabel">Envío a</p><p className="meta">{order.direccion}, {order.ciudad}</p></div>
                <div><p className="optlabel">Pago</p><p className="meta">{order.ultimos4 ? `Cuenta terminada en ${order.ultimos4}` : 'Pago simulado'}</p></div>
                <div className="kv tot"><span>Total pagado</span><strong>{money(order.total)}</strong></div>
            </div>
        </>
    );
}
