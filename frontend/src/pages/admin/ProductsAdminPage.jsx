import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../hooks/useToast';
import { EmptyState, Field, Message, ProductImage } from '../../components/ui';
import { CATEGORIAS, categoriaById } from '../../data/seed';
import { createProduct, getProducts, setProductActive, updateProduct } from '../../services/products.service';
import { money, urlImagen } from '../../utils/format';

const EMPTY = { nombre: '', descripcion: '', categoria: 'montana', precio: '', stock: '' };

function Status({ p }) {
    if (!p.activo) return <span className="st off">Inactivo</span>;
    if (p.stock <= 0) return <span className="st out">Agotado</span>;
    if (p.stock <= 3) return <span className="st low">Stock bajo</span>;
    return <span className="st on">Activo</span>;
}

// Formulario del diálogo «Nuevo / Editar producto» (RF-17, RF-18, RF-19)
function ProductForm({ product, onSaved, onCancel }) {
    const isNew = !product;
    const [form, setForm] = useState(() => (product
        ? { nombre: product.nombre, descripcion: product.descripcion, categoria: product.categoria, precio: String(product.precio), stock: String(product.stock) }
        : EMPTY));
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(product ? urlImagen(product.imagen) : null);
    const [error, setError] = useState('');
    const [invalid, setInvalid] = useState([]);
    const [saving, setSaving] = useState(false);

    function change(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function changeFile(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
            setError('Formato de imagen no permitido (solo jpg, png o webp).');
            setInvalid(['imagen']);
            return;
        }
        if (f.size > 2 * 1024 * 1024) {
            setError('La imagen no puede pesar más de 2 MB.');
            setInvalid(['imagen']);
            return;
        }
        setFile(f);
        setPreview(URL.createObjectURL(f));
        setError('');
        setInvalid([]);
    }

    function fail(message, fields) {
        setError(message);
        setInvalid(fields);
    }

    async function submit(e) {
        e.preventDefault();
        const { nombre, descripcion, precio, stock } = form;
        if (!nombre.trim() || !descripcion.trim() || precio === '' || stock === '' || (isNew && !file)) {
            return fail('Complete todos los campos.', [!nombre.trim() ? 'nombre' : !descripcion.trim() ? 'descripcion' : precio === '' ? 'precio' : stock === '' ? 'stock' : 'imagen']);
        }
        if (!(Number(precio) > 0)) return fail('El precio debe ser mayor que cero.', ['precio']);
        if (!/^\d+$/.test(stock)) return fail('Las existencias deben ser un número entero mayor o igual a cero.', ['stock']);

        setSaving(true);
        try {
            const data = { ...form, nombre: nombre.trim(), descripcion: descripcion.trim(), imagenFile: file };
            const saved = isNew ? await createProduct(data) : await updateProduct(product.id_producto, data);
            onSaved(saved, isNew);
        } catch (err) {
            fail(err.message, []);
            setSaving(false);
        }
    }

    return (
        <form className="dlg frm" noValidate onSubmit={submit}>
            <h2 id="dlg-t">{isNew ? 'Nuevo producto' : 'Editar producto'}</h2>
            <div><Message kind="err">{error}</Message></div>
            <Field id="pf-name" name="nombre" label="Nombre" value={form.nombre} onChange={change} invalid={invalid.includes('nombre')} autoFocus />
            <div className="field">
                <label htmlFor="pf-desc">Descripción</label>
                <textarea className="inp" id="pf-desc" name="descripcion" value={form.descripcion} onChange={change} aria-invalid={invalid.includes('descripcion') || undefined} />
            </div>
            <div className="two">
                <div className="field">
                    <label htmlFor="pf-cat">Categoría</label>
                    <select className="sel" id="pf-cat" name="categoria" value={form.categoria} onChange={change}>
                        {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="pf-img">Imagen (jpg, png o webp)</label>
                    <input className="inp" id="pf-img" type="file" accept="image/jpeg,image/png,image/webp" onChange={changeFile} aria-invalid={invalid.includes('imagen') || undefined} />
                    {!isNew && <p className="hint">Déjala vacía para conservar la imagen actual.</p>}
                </div>
            </div>
            {preview && (
                <div className="thumb" style={{ width: 96, height: 96 }}>
                    <img src={preview} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            )}
            <div className="two">
                <Field id="pf-price" name="precio" label="Precio (COP)" type="number" min="1" step="1000" inputMode="numeric"
                    value={form.precio} onChange={change} invalid={invalid.includes('precio')} />
                <Field id="pf-stock" name="stock" label="Existencias" type="number" min="0" step="1" inputMode="numeric"
                    value={form.stock} onChange={change} invalid={invalid.includes('stock')} />
            </div>
            <div className="row">
                <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>Guardar producto</button>
            </div>
        </form>
    );
}

// RF-17..20: gestión de productos (crear, editar, inactivar)
export default function ProductsAdminPage() {
    const toast = useToast();
    const { refreshProducts } = useCart();
    const [products, setProducts] = useState([]);
    const [filters, setFilters] = useState({ q: '', categoria: 'todas', estado: 'todos' });
    const [editing, setEditing] = useState(undefined); // undefined: cerrado, null: nuevo, objeto: editar
    const dialogRef = useRef(null);

    const load = useCallback(async () => {
        try {
            setProducts(await getProducts({ incluirInactivos: true }));
        } catch (err) {
            toast.show(err.message);
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const d = dialogRef.current;
        if (editing !== undefined && !d.open) d.showModal();
        if (editing === undefined && d.open) d.close();
    }, [editing]);

    async function afterChange() {
        await load();
        refreshProducts();
    }

    async function toggle(p) {
        try {
            await setProductActive(p.id_producto, !p.activo);
            await afterChange();
            toast.show(
                !p.activo ? `${p.nombre} quedó activo y vuelve a aparecer en el catálogo` : `${p.nombre} quedó inactivo y ya no aparece en el catálogo`,
                'Deshacer',
                async () => {
                    await setProductActive(p.id_producto, p.activo);
                    afterChange();
                }
            );
        } catch (err) {
            toast.show(err.message);
        }
    }

    function saved(p, isNew) {
        setEditing(undefined);
        afterChange();
        toast.show(isNew ? `${p.nombre} quedó registrado y ya aparece en el catálogo` : `Cambios guardados en ${p.nombre}`);
    }

    const q = filters.q.trim().toLowerCase();
    const list = products.filter((p) => (!q || p.nombre.toLowerCase().includes(q))
        && (filters.categoria === 'todas' || p.categoria === filters.categoria)
        && (filters.estado === 'todos' || (filters.estado === 'activos') === p.activo));

    const setF = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

    return (
        <>
            <div className="ahead">
                <div>
                    <h1>Productos</h1>
                    <p>Registra productos, actualiza precios y existencias, e inactiva los que ya no se venden.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setEditing(null)}>Nuevo producto</button>
            </div>

            <form className="box filters" role="search" onSubmit={(e) => e.preventDefault()}>
                <div className="field" style={{ flex: '2 1 240px' }}>
                    <label htmlFor="ap-q">Buscar por nombre</label>
                    <input className="inp" id="ap-q" name="q" type="search" value={filters.q} onChange={setF} placeholder="Ej.: casco, MTB" />
                </div>
                <div className="field">
                    <label htmlFor="ap-cat">Categoría</label>
                    <select className="sel" id="ap-cat" name="categoria" value={filters.categoria} onChange={setF}>
                        <option value="todas">Todas</option>
                        {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="ap-est">Estado</label>
                    <select className="sel" id="ap-est" name="estado" value={filters.estado} onChange={setF}>
                        <option value="todos">Todos</option>
                        <option value="activos">Activos</option>
                        <option value="inactivos">Inactivos</option>
                    </select>
                </div>
            </form>

            <p className="tcount" aria-live="polite">{list.length} de {products.length} productos</p>

            {list.length ? (
                <div className="box">
                    <table className="tbl">
                        <thead><tr><th>Producto</th><th className="num">Precio</th><th className="num">Existencias</th><th>Estado</th><th className="num">Acciones</th></tr></thead>
                        <tbody>
                            {list.map((p) => (
                                <tr key={p.id_producto}>
                                    <td className="first" data-l="Producto">
                                        <div className="who">
                                            <span className="thumb"><ProductImage product={p} decorative /></span>
                                            <div><b>{p.nombre}</b><small>{categoriaById(p.categoria).nombre}</small></div>
                                        </div>
                                    </td>
                                    <td className="num" data-l="Precio">{money(p.precio)}</td>
                                    <td className="num" data-l="Existencias">{p.stock}</td>
                                    <td data-l="Estado"><Status p={p} /></td>
                                    <td data-l="Acciones">
                                        <div className="acts">
                                            <button className="btn btn-outline btn-sm" onClick={() => setEditing(p)}>Editar</button>
                                            <button className={`btn btn-sm ${p.activo ? 'btn-outline' : 'btn-dark'}`} onClick={() => toggle(p)}>
                                                {p.activo ? 'Inactivar' : 'Activar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState title="Sin resultados">No hay productos que coincidan con la búsqueda.</EmptyState>
            )}

            <dialog ref={dialogRef} aria-labelledby="dlg-t" onClose={() => setEditing(undefined)}>
                {editing !== undefined && (
                    <ProductForm
                        key={editing ? editing.id_producto : 'nuevo'}
                        product={editing}
                        onSaved={saved}
                        onCancel={() => setEditing(undefined)}
                    />
                )}
            </dialog>
        </>
    );
}
