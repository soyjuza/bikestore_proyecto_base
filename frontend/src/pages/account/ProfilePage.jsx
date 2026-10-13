import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Field, Message } from '../../components/ui';
import { updateMe } from '../../services/users.service';
import { EMAIL_RE } from '../../utils/format';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const { reloadOrders } = useOutletContext();
    const toast = useToast();
    const [form, setForm] = useState({ nombre: user.nombre, email: user.email });
    const [error, setError] = useState('');
    const [invalid, setInvalid] = useState([]);

    function change(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function submit(e) {
        e.preventDefault();
        const nombre = form.nombre.trim();
        const email = form.email.trim();
        if (!nombre || !email) {
            setError('Complete todos los campos.');
            setInvalid([!nombre ? 'nombre' : 'email']);
            return;
        }
        if (!EMAIL_RE.test(email)) {
            setError('Ingrese un correo electrónico válido.');
            setInvalid(['email']);
            return;
        }
        try {
            const updated = await updateMe({ nombre, email });
            updateUser({ ...user, ...updated });
            setError('');
            setInvalid([]);
            reloadOrders();
            toast.show('Datos guardados');
        } catch (err) {
            setError(err.message);
            setInvalid(err.status === 409 ? ['email'] : []);
        }
    }

    return (
        <form className="frm accform" noValidate onSubmit={submit}>
            <h2 className="acc-h">Mis datos</h2>
            <div><Message kind="err">{error}</Message></div>
            <Field id="m-name" name="nombre" label="Nombre" autoComplete="name"
                value={form.nombre} onChange={change} invalid={invalid.includes('nombre')} />
            <Field id="m-email" name="email" label="Correo electrónico" type="email" autoComplete="email" hint="Con este correo inicias sesión."
                value={form.email} onChange={change} invalid={invalid.includes('email')} />
            <div><button className="btn btn-primary" type="submit">Guardar cambios</button></div>
        </form>
    );
}
