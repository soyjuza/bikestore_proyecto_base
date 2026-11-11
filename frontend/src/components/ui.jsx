// Piezas pequeñas que se repiten en casi todas las páginas.
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconError, IconEye, IconEyeOff, IconOk } from './Icons';
import { urlImagen } from '../utils/format';
import { PASSWORD_RULES } from '../utils/password';

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
    // Las contraseñas llevan el ojo para mostrar u ocultar lo escrito (el código de seguridad de la tarjeta no).
    const isPassword = type === 'password' && String(props.autoComplete || '').includes('password');
    const [visible, setVisible] = useState(false);
    const input = (
        <input
            className="inp"
            id={id}
            name={id}
            type={isPassword && visible ? 'text' : type}
            aria-invalid={invalid ? 'true' : undefined}
            {...(isPassword ? { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } : {})}
            {...props}
        />
    );
    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            {isPassword ? (
                <div className="passwrap">
                    {input}
                    <button
                        type="button"
                        className="eye"
                        onClick={() => setVisible((v) => !v)}
                        aria-label={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                        aria-pressed={visible}
                        aria-controls={id}
                        title={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                    >
                        {visible ? <IconEyeOff /> : <IconEye />}
                    </button>
                </div>
            ) : input}
            {hint && <p className="hint">{hint}</p>}
        </div>
    );
}

// Lista de requisitos debajo de la contraseña nueva: cada uno se marca apenas se cumple.
export function PasswordRules({ value, id }) {
    return (
        <ul className="prules" id={id} aria-label="Requisitos de la contraseña">
            {PASSWORD_RULES.map((r) => {
                const ok = r.test(value);
                return (
                    <li key={r.id} className={ok ? 'ok' : undefined}>
                        <i aria-hidden="true" />
                        {r.label}
                        <span className="vh">{ok ? ' (cumplido)' : ' (falta)'}</span>
                    </li>
                );
            })}
        </ul>
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
