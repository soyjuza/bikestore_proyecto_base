import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import AuthShell from '../components/AuthShell';
import { Field, Message } from '../components/ui';
import { DEMO_ACCOUNTS } from '../data/seed';
import { USE_MOCK } from '../config/env';
import { firstName } from '../utils/format';

// RF-15: inicio de sesión. Al entrar, el carrito sin cuenta se suma al de la cuenta (CartContext).
export default function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state || {};

    const [form, setForm] = useState({ email: state.prefill || '', password: '' });
    const [error, setError] = useState(state.flash || '');
    const [ok, setOk] = useState(state.flashOk || '');
    const [invalid, setInvalid] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const passRef = useRef(null);

    if (isAuthenticated && !submitting) return <Navigate to="/" replace />;

    function change(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function submit(e) {
        e.preventDefault();
        setOk('');
        if (!form.email.trim() || !form.password) {
            setError('Complete todos los campos.');
            setInvalid([!form.email.trim() ? 'email' : 'password']);
            return;
        }
        setError('');
        setInvalid([]);
        setSubmitting(true);
        try {
            const user = await login({ email: form.email.trim(), password: form.password });
            const from = state.from;
            const go = user.rol === 'admin'
                ? (from?.startsWith('/admin') ? from : '/admin')
                : (from && !from.startsWith('/admin') ? from : '/');
            toast.show(`Hola, ${firstName(user.nombre)}. Sesión iniciada${user.rol === 'admin' ? ' como administrador' : ''}`);
            navigate(go, { replace: true });
        } catch (err) {
            setError(err.message);
            if (err.status === 401) setInvalid(['email', 'password']);
            setSubmitting(false);
        }
    }

    function fillDemo(account) {
        setForm({ email: account.email, password: account.password });
        passRef.current?.focus();
    }

    return (
        <AuthShell productId={1} title="Rueda más lejos" text="Entra a tu cuenta para pagar y recuperar tu carrito guardado.">
            <form className="frm" noValidate onSubmit={submit}>
                <h1>Iniciar sesión</h1>
                <div>
                    <Message kind="err">{error}</Message>
                    <Message kind="ok">{ok}</Message>
                </div>
                <Field id="l-email" name="email" label="Correo electrónico" type="email" autoComplete="email"
                    value={form.email} onChange={change} invalid={invalid.includes('email')} />
                <Field id="l-pass" name="password" label="Contraseña" type="password" autoComplete="current-password"
                    value={form.password} onChange={change} invalid={invalid.includes('password')} ref={passRef} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link className="linkbtn" to="/recuperar" style={{ minHeight: 32 }}>¿Olvidó su contraseña?</Link>
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                    {submitting ? 'Ingresando…' : 'Iniciar sesión'}
                </button>
                <p className="center">¿No tienes cuenta? <Link className="linkbtn" to="/registro" style={{ minHeight: 32 }}>Crear cuenta</Link></p>

                {USE_MOCK && (
                    <div className="demo">
                        <b>Cuentas de demostración</b>
                        {DEMO_ACCOUNTS.map((a) => (
                            <button type="button" key={a.email} onClick={() => fillDemo(a)}>
                                {a.label}<span>{a.email} / {a.password}</span>
                            </button>
                        ))}
                    </div>
                )}
            </form>
        </AuthShell>
    );
}
