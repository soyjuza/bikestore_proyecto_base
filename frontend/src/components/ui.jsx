// Piezas pequeñas que se repiten en casi todas las páginas.
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { IconError, IconOk } from './Icons';
import { urlImagen } from '../utils/format';

export function Message({ kind = 'ok', children }) {
    if (!children) return null;
    return (
        <div className={`msg ${kind}`} role={kind === 'err' ? 'alert' : 'status'}>
            {kind === 'err' ? <IconError /> : <IconOk />}
            <span>{children}</span>
        </div>
    );
}

export function Field({ id, label, hint, invalid, type = 'text', ...props }) {
    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <input className="inp" id={id} name={id} type={type} aria-invalid={invalid ? 'true' : undefined} {...props} />
            {hint && <p className="hint">{hint}</p>}
        </div>
    );
}

export function Breadcrumbs({ items }) {
    return (
        <nav className="crumbs" aria-label="Ruta">
            {items.map(([to, label], i) => (i === items.length - 1
                ? <b key={label}>{label}</b>
                : (
                    <Fragment key={label}>
                        <Link to={to}>{label}</Link>
                        <span aria-hidden="true">/</span>
                    </Fragment>
                )))}
        </nav>
    );
}

export function Stepper({ value, onDec, onInc, canDec, canInc, label = '' }) {
    return (
        <div className="stepper">
            <button type="button" onClick={onDec} disabled={!canDec} aria-label={`Disminuir cantidad${label}`}>−</button>
            <output aria-live="polite">{value}</output>
            <button type="button" onClick={onInc} disabled={!canInc} aria-label={`Aumentar cantidad${label}`}>+</button>
        </div>
    );
}

// Si una imagen subida por el administrador no carga, se oculta en vez de mostrar el ícono roto.
export function ProductImage({ product, photo = false, lazy = true, decorative = false, className }) {
    if (!product) return null;
    const usePhoto = photo && product.foto;
    return (
        <img
            className={usePhoto ? 'photo' : className}
            src={usePhoto ? product.foto : urlImagen(product.imagen)}
            alt={decorative ? '' : product.nombre}
            loading={lazy ? 'lazy' : undefined}
            decoding="async"
            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />
    );
}

export function EmptyState({ title, children, action, style }) {
    return (
        <div className="empty" style={style}>
            {title && <h3>{title}</h3>}
            {children && <p>{children}</p>}
            {action}
        </div>
    );
}
