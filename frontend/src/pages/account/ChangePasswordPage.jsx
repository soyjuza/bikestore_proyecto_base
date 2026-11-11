import { useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Field, Message, PasswordRules } from '../../components/ui';
import { WEAK_PASSWORD, isStrongPassword } from '../../utils/password';
import { changePassword } from '../../services/users.service';

const EMPTY = { actual: '', nueva: '', nueva2: '' };

export default function ChangePasswordPage() {
    const toast = useToast();
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [invalid, setInvalid] = useState([]);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false); // evita que un doble clic cambie la contraseña dos veces

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
        if (!isStrongPassword(nueva)) return fail(WEAK_PASSWORD, ['nueva']);
        if (nueva === actual) return fail('La contraseña nueva debe ser distinta de la actual.', ['nueva']);
        if (nueva !== nueva2) return fail('Las contraseñas nuevas no coinciden.', ['nueva', 'nueva2']);
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        try {
            await changePassword({ actual, nueva });
            setForm(EMPTY);
            fail('', []);
            toast.show('Contraseña cambiada');
        } catch (err) {
            fail(err.message, err.message.includes('actual no es') ? ['actual'] : ['nueva']);
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }

    return (
        <form className="frm accform" noValidate onSubmit={submit}>
            <h2 className="acc-h">Contraseña</h2>
            <div><Message kind="err">{error}</Message></div>
            <Field id="c-old" name="actual" label="Contraseña actual" type="password" autoComplete="current-password"
                value={form.actual} onChange={change} invalid={invalid.includes('actual')} />
            <div className="pfield">
                <Field id="c-new" name="nueva" label="Contraseña nueva" type="password" autoComplete="new-password" aria-describedby="c-new-rules"
                    value={form.nueva} onChange={change} invalid={invalid.includes('nueva')} />
                <PasswordRules id="c-new-rules" value={form.nueva} />
            </div>
            <Field id="c-new2" name="nueva2" label="Confirmar la contraseña nueva" type="password" autoComplete="new-password"
                value={form.nueva2} onChange={change} invalid={invalid.includes('nueva2')} />
            <div><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button></div>
        </form>
    );
}
