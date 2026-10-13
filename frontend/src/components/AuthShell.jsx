import { useCart } from '../hooks/useCart';
import { ProductImage } from './ui';

// Marco de las páginas de acceso: foto del producto a la izquierda, formulario a la derecha.
export default function AuthShell({ productId, title, text, children }) {
    const { products } = useCart();
    const product = products.find((p) => p.id_producto === productId);

    return (
        <div className="view">
            <div className="authpage">
                <div className="authart">
                    {product && <ProductImage product={product} lazy={false} decorative />}
                    <div>
                        <h2>{title}</h2>
                        <p>{text}</p>
                    </div>
                </div>
                <div className="authform">{children}</div>
            </div>
        </div>
    );
}
