import { useSearchParams } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';
import { Breadcrumbs, EmptyState } from '../components/ui';
import { CATEGORIAS, categoriaById } from '../data/seed';
import { plural } from '../utils/format';

const SORT_TEXT = { asc: 'precio de menor a mayor', desc: 'precio de mayor a menor' };

// RF-01..04: catálogo público, filtro por categoría y orden por precio (quedan en la URL)
export default function CatalogPage() {
    const { products } = useCart();
    const [params, setParams] = useSearchParams();
    const cat = CATEGORIAS.some((c) => c.id === params.get('categoria')) ? params.get('categoria') : 'todas';
    const orden = ['asc', 'desc'].includes(params.get('orden')) ? params.get('orden') : 'none';

    function update(key, value, empty) {
        const next = new URLSearchParams(params);
        if (value === empty) next.delete(key);
        else next.set(key, value);
        setParams(next, { replace: true });
    }
    const setCat = (v) => update('categoria', v, 'todas');
    const setOrden = (v) => update('orden', v, 'none');

    let list = products.filter((p) => cat === 'todas' || p.categoria === cat);
    if (orden === 'asc') list = [...list].sort((a, b) => a.precio - b.precio);
    if (orden === 'desc') list = [...list].sort((a, b) => b.precio - a.precio);

    const category = cat === 'todas' ? null : categoriaById(cat);

    let body;
    if (!products.length) {
        body = <EmptyState title="Catálogo vacío">No hay productos disponibles en este momento.</EmptyState>;
    } else if (!list.length) {
        body = (
            <EmptyState title={category.nombre} action={<button className="btn btn-primary" onClick={() => setCat('todas')}>Quitar filtro</button>}>
                No hay productos disponibles en esta categoría.
            </EmptyState>
        );
    } else {
        body = (
            <div className="grid g4">
                {list.map((p, i) => <ProductCard key={p.id_producto} product={p} index={i} />)}
            </div>
        );
    }

    return (
        <div className="view">
            <section className="wrap pagehead">
                <Breadcrumbs items={[['/', 'Inicio'], ['/catalogo', 'Catálogo']]} />
                <h1 className="h1">{category ? category.nombre : 'Catálogo'}</h1>
                <p className="lead">{category ? category.descripcion : 'Todos los productos de la tienda. No necesitas cuenta para consultarlos.'}</p>

                <ProductFilters products={products} categoria={cat} orden={orden} onCategoria={setCat} onOrden={setOrden} />

                <div className="applied" aria-live="polite">
                    <span>{list.length} {plural(list.length, 'producto', 'productos')}</span>
                    {category && (
                        <>
                            <span>Categoría: <b>{category.nombre}</b></span>
                            <button className="clear" onClick={() => setCat('todas')}>Quitar filtro</button>
                        </>
                    )}
                    {SORT_TEXT[orden] && (
                        <>
                            <span>Ordenado por <b>{SORT_TEXT[orden]}</b></span>
                            <button className="clear" onClick={() => setOrden('none')}>Quitar orden</button>
                        </>
                    )}
                </div>
                {body}
            </section>
            <div style={{ height: 96 }} />
        </div>
    );
}
