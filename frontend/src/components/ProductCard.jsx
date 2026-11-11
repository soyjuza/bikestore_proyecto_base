import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { categoriaById } from '../data/seed';
import { money } from '../utils/format';
import { IconAdd } from './Icons';
import { ProductImage } from './ui';

export function Availability({ stock }) {
    if (stock <= 0) return <p className="avail out"><i />Agotado</p>;
    if (stock <= 3) return <p className="avail low"><i />Quedan {stock}</p>;
    return <p className="avail"><i />{stock} disponibles</p>;
}

export default function ProductCard({ product, index = 0, feature = false }) {
    const { add } = useCart();
    const btnRef = useRef(null);
    const out = product.stock <= 0;
    const to = `/producto/${product.id_producto}`;

    function addToCart() {
        add(product, 1);
        const b = btnRef.current;
        b.classList.remove('pop');
        void b.offsetWidth;
        b.classList.add('pop');
    }

    return (
        <article
            className={`card${feature ? ' feature' : ''}${out ? ' out' : ''}`}
            data-reveal
            style={{ '--d': `${(index % 4) * 80}ms` }}
        >
            <div className="media">
                <Link className="ml" to={to} aria-label={`Ver detalle de ${product.nombre}`}>
                    <ProductImage product={product} />
                </Link>
                {out && <span className="flag">Agotado</span>}
            </div>
            <div className="cbody">
                <p className="cmeta">{categoriaById(product.categoria).nombre}</p>
                <Link className="cname" to={to}>{product.nombre}</Link>
                {feature && <p className="cdesc">{product.descripcion}</p>}
                <div className="cfoot">
                    <div className="cbuy">
                        <span className="price">{money(product.precio)}</span>
                        <Availability stock={product.stock} />
                    </div>
                    <button
                        ref={btnRef}
                        className="add"
                        disabled={out}
                        onClick={addToCart}
                        aria-label={`Agregar ${product.nombre} al carrito`}
                        title="Agregar al carrito"
                    >
                        <IconAdd />
                    </button>
                </div>
            </div>
        </article>
    );
}
