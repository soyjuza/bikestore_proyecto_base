import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Lock, Mail, User, UserPlus } from "lucide-react";
import { register } from "../services/auth.service";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        nombre: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    function change(event) {
        setForm({ ...form, [event.target.name]: event.target.value });
    }

    async function submit(event) {
        event.preventDefault();
        setError('');

        try {
            await register(form);
            navigate('/login');
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <main className="auth-page">
            <form className="card auth-card" onSubmit={submit}>
                <h1>LAB CRUD</h1>
                <h2>Crear usuario</h2>

                {error && <p className="error"><AlertCircle size={16} />{error}</p>}

                <div className="field">
                    <User size={16} />
                    <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={change} autoComplete="name" required />
                </div>
                <div className="field">
                    <Mail size={16} />
                    <input name="email" type="email" placeholder="Correo" value={form.email} onChange={change} autoComplete="email" required />
                </div>
                <div className="field">
                    <Lock size={16} />
                    <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Contraseña"
                    value={form.password}
                    onChange={change}
                    autoComplete="new-password"
                    className="has-toggle"
                    required
                    />
                    <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                <button type="submit">
                    <UserPlus size={16} />
                    Registrarme
                </button>
                <p>¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
            </form>
        </main>
    );
}