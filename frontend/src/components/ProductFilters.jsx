import { CATEGORIAS } from '../data/seed';

// RF-02 (filtrar por categoría) y RF-03 (ordenar por precio)
export default function ProductFilters({ products, categoria, orden, onCategoria, onOrden }) {
    const countOf = (id) => products.filter((p) => p.categoria === id).length;

    return (
        <div className="toolbar">
            <div className="chips" role="group" aria-label="Filtrar por categoría">
                <button className="chip" aria-pressed={categoria === 'todas'} onClick={() => onCategoria('todas')}>
                    Todas<small>{products.length}</small>
                </button>
                {CATEGORIAS.map((c) => (
                    <button key={c.id} className="chip" aria-pressed={categoria === c.id} onClick={() => onCategoria(c.id)}>
                        {c.nombre}<small>{countOf(c.id)}</small>
                    </button>
                ))}
            </div>
            <label className="sortbox">
                Ordenar
                <select className="sel" value={orden} onChange={(e) => onOrden(e.target.value)}>
                    <option value="none">Sin ordenar</option>
                    <option value="asc">Precio: menor a mayor</option>
                    <option value="desc">Precio: mayor a menor</option>
                </select>
            </label>
        </div>
    );
}
