import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getProducts } from '../services/products.service';
import { getCart, saveCart } from '../services/cart.service';
import { getGuestCart, saveGuestCart } from '../utils/storage';
import { plural } from '../utils/format';

export const CartContext = createContext(null);

/* El carrito guarda { id_producto, cantidad }. Sin sesión vive en el navegador;
   al iniciar sesión se suma al carrito guardado en la cuenta (RF-08). */
export function CartProvider({ children }) {
    const { user, logout } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const userId = user?.id_usuario ?? null;

    const [products, setProducts] = useState([]);
    const [productsLoaded, setProductsLoaded] = useState(false);
    const [items, setItems] = useState(() => (userId ? [] : getGuestCart()));
    const [bump, setBump] = useState(0);
    const userRef = useRef(userId);
    userRef.current = userId;

    const refreshProducts = useCallback(async () => {
        try {
            const list = await getProducts();
            setProducts(list);
            return list;
        } catch {
            return [];
        } finally {
            setProductsLoaded(true);
        }
    }, []);

    useEffect(() => {
        refreshProducts();
    }, [refreshProducts]);

    const loadCart = useCallback(async () => {
        if (!userId) {
            setItems(getGuestCart());
            return;
        }
        try {
            let list = await getCart();
            const guest = getGuestCart();
            if (guest.length) {
                const catalog = await getProducts();
                const stockOf = (id) => catalog.find((p) => p.id_producto === id)?.stock ?? 0;
                list = [...list];
                guest.forEach((g) => {
                    const found = list.find((i) => i.id_producto === g.id_producto);
                    if (found) found.cantidad = Math.min(stockOf(g.id_producto), found.cantidad + g.cantidad);
                    else list.push({ id_producto: g.id_producto, cantidad: Math.min(stockOf(g.id_producto), g.cantidad) });
                });
                list = await saveCart(list.filter((i) => i.cantidad > 0));
                saveGuestCart([]);
            }
            setItems(list);
        } catch (err) {
            if (err.status === 401 || err.status === 403) logout();
        }
    }, [userId, logout]);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    const persist = useCallback((next) => {
        setItems(next);
        if (userRef.current) saveCart(next).catch(() => toast.show('No se pudo guardar el carrito en tu cuenta'));
        else saveGuestCart(next);
    }, [toast]);

    const lines = useMemo(
        () => items
            .map((i) => ({ ...i, product: products.find((p) => p.id_producto === i.id_producto) }))
            .filter((l) => l.product && l.product.activo),
        [items, products]
    );

    const count = lines.reduce((a, l) => a + l.cantidad, 0);
    const total = lines.reduce((a, l) => a + l.product.precio * l.cantidad, 0);

    const qtyOf = useCallback((id) => items.find((i) => i.id_producto === id)?.cantidad || 0, [items]);

    const add = useCallback((product, qty = 1) => {
        if (!product || !product.activo) return;
        if (product.stock <= 0) {
            toast.show('Este producto está agotado');
            return;
        }
        const current = items.find((i) => i.id_producto === product.id_producto);
        let want = (current ? current.cantidad : 0) + qty;
        if (want > product.stock) {
            want = product.stock;
            toast.show(`Solo hay ${product.stock} ${plural(product.stock, 'unidad disponible', 'unidades disponibles')} de ${product.nombre}`);
        } else {
            toast.show(`${product.nombre} se agregó al carrito`, 'Ver carrito', () => navigate('/carrito'));
        }
        persist(current
            ? items.map((i) => (i === current ? { ...i, cantidad: want } : i))
            : [...items, { id_producto: product.id_producto, cantidad: want }]);
        setBump((b) => b + 1);
    }, [items, persist, toast, navigate]);

    const setQty = useCallback((id, cantidad) => {
        persist(items.map((i) => (i.id_producto === id ? { ...i, cantidad } : i)));
    }, [items, persist]);

    const remove = useCallback((id) => {
        const removed = items.find((i) => i.id_producto === id);
        persist(items.filter((i) => i.id_producto !== id));
        return removed;
    }, [items, persist]);

    const restore = useCallback((item) => {
        setItems((prev) => {
            const next = [...prev.filter((i) => i.id_producto !== item.id_producto), item];
            if (userRef.current) saveCart(next).catch(() => {});
            else saveGuestCart(next);
            return next;
        });
        setBump((b) => b + 1);
    }, []);

    const value = useMemo(
        () => ({ products, productsLoaded, lines, count, total, bump, qtyOf, add, setQty, remove, restore, refreshProducts, reloadCart: loadCart }),
        [products, productsLoaded, lines, count, total, bump, qtyOf, add, setQty, remove, restore, refreshProducts, loadCart]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
