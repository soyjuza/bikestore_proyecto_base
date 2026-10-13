import { Link } from 'react-router-dom';
import { categoriaById } from '../data/seed';
import { money } from '../utils/format';
import { ProductImage, Stepper } from './ui';

// Una línea del carrito: cantidad limitada por las existencias (RF-06, RF-07)
export default function CartItem({ line, onQty, onRemove }) {
    const { product: p, cantidad } = line;
    const to = `/producto/${p.id_producto}`;

    return (
        <article className="crow">
            <Link className="media" to={to} aria-label={`Ver ${p.nombre}`}>
                <ProductImage product={p} decorative />
            </Link>
            <div>
                <h3><Link to={to}>{p.nombre}</Link></h3>
                <p className="meta">{categoriaById(p.categoria).nombre}, {money(p.precio)} c/u</p>
                {cantidad >= p.stock && <p className="meta" style={{ color: 'var(--amber)' }}>Máximo disponible: {p.stock}</p>}
            </div>
            <Stepper
                value={cantidad}
                label={` de ${p.nombre}`}
                canDec={cantidad > 1}
                canInc={cantidad < p.stock}
                onDec={() => onQty(Math.max(1, cantidad - 1))}
                onInc={() => onQty(Math.min(p.stock, cantidad + 1))}
            />
            <div className="lp">
                <strong>{money(p.precio * cantidad)}</strong>
                <button className="rm" onClick={onRemove}>Quitar</button>
            </div>
        </article>
    );
}
