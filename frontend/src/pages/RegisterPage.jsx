import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Field, Message, PasswordRules } from '../components/ui';
import { register } from '../services/auth.service';
import { EMAIL_RE } from '../utils/format';
import { WEAK_PASSWORD, isStrongPassword } from '../utils/password';

// RF-13, RF-14: registro de clientes (el rol siempre es «cliente»; la contraseña se cifra en el backend)
export default function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ nombre: '', email: '', password: '' });
    const [error, setError] = useState(null);
    const [invalid, setInvalid] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    function change(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function fail(message, fields) {
        setError(message);
        setInvalid(fields);
    }

    async function submit(e) {
        e.preventDefault();
        const nombre = form.nombre.trim();
        const email = form.email.trim();
        if (!nombre || !email || !form.password) return fail('Complete todos los campos.', [!nombre ? 'nombre' : !email ? 'email' : 'password']);
        if (!isStrongPassword(form.password)) return fail(WEAK_PASSWORD, ['password']);
        if (!EMAIL_RE.test(email)) return fail('Ingrese un correo electrónico válido.', ['email']);

        setSubmitting(true);
        try {
            await register({ nombre, email, password: form.password });
            navigate('/ingresar', { state: { flashOk: 'Su cuenta fue creada correctamente. Ya puede iniciar sesión.', prefill: email } });
        } catch (err) {
            if (err.status === 409) {
                fail(<>Este correo ya tiene una cuenta. <Link to="/ingresar">Inicie sesión</Link> o <Link to="/recuperar">recupere su contraseña</Link>.</>, ['email']);
            } else {
                fail(err.message, []);
            }
            setSubmitting(false);
        }
    }

    return (
        <AuthShell productId={5} title="Tu próxima ruta empieza aquí" text="Con tu cuenta de cliente puedes pagar tus pedidos y guardar el carrito.">
            <form className="frm" noValidate onSubmit={submit}>
                <h1>Crear cuenta</h1>
                <div><Message kind="err">{error}</Message></div>
                <Field id="r-name" name="nombre" label="Nombre" autoComplete="name"
                    value={form.nombre} onChange={change} invalid={invalid.includes('nombre')} />
                <Field id="r-email" name="email" label="Correo electrónico" type="email" autoComplete="email"
                    value={form.email} onChange={change} invalid={invalid.includes('email')} />
                <div className="pfield">
                    <Field id="r-pass" name="password" label="Contraseña" type="password" autoComplete="new-password" aria-describedby="r-pass-rules"
                        value={form.password} onChange={change} invalid={invalid.includes('password')} />
                    <PasswordRules id="r-pass-rules" value={form.password} />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>Crear cuenta</button>
                <p className="center">¿Ya tienes cuenta? <Link className="linkbtn" to="/ingresar" style={{ minHeight: 32 }}>Iniciar sesión</Link></p>
                <p className="fine" style={{ textAlign: 'center' }}>La contraseña se guarda cifrada con bcrypt (RNF-05).</p>
            </form>
        </AuthShell>
    );
}
