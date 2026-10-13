import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Field, Message } from '../../components/ui';
import { changePassword } from '../../services/users.service';

const EMPTY = { actual: '', nueva: '', nueva2: '' };

export default function ChangePasswordPage() {
    const toast = useToast();
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [invalid, setInvalid] = useState([]);

    function change(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function fail(message, fields) {
        setError(message);
        setInvalid(fields);
    }

    async function submit(e) {
        e.preventDefault();
        const { actual, nueva, nueva2 } = form;
        if (!actual || !nueva || !nueva2) return fail('Complete todos los campos.', [!actual ? 'actual' : !nueva ? 'nueva' : 'nueva2']);
        if (nueva.length < 8) return fail('La contraseña nueva debe tener al menos 8 caracteres.', ['nueva']);
        if (nueva !== nueva2) return fail('Las contraseñas nuevas no coinciden.', ['nueva', 'nueva2']);
        try {
            await changePassword({ actual, nueva });
            setForm(EMPTY);
            fail('', []);
            toast.show('Contraseña cambiada');
        } catch (err) {
            fail(err.message, ['actual']);
        }
    }

    return (
        <form className="frm accform" noValidate onSubmit={submit}>
            <h2 className="acc-h">Contraseña</h2>
            <div><Message kind="err">{error}</Message></div>
            <Field id="c-old" name="actual" label="Contraseña actual" type="password" autoComplete="current-password"
                value={form.actual} onChange={change} invalid={invalid.includes('actual')} />
            <Field id="c-new" name="nueva" label="Contraseña nueva" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres."
                value={form.nueva} onChange={change} invalid={invalid.includes('nueva')} />
            <Field id="c-new2" name="nueva2" label="Confirmar la contraseña nueva" type="password" autoComplete="new-password"
                value={form.nueva2} onChange={change} invalid={invalid.includes('nueva2')} />
            <div><button className="btn btn-primary" type="submit">Cambiar contraseña</button></div>
        </form>
    );
}
