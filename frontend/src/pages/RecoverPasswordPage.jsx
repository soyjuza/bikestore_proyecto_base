import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Field, Message } from '../components/ui';
import { checkResetToken, requestPasswordReset, resetPassword } from '../services/auth.service';
import { USE_MOCK } from '../config/env';

/* RF-16: recuperar contraseña en dos pasos.
   1) /recuperar            -> se pide el correo y el backend envía un enlace con un token de un solo uso (30 min).
   2) /recuperar?token=...  -> se valida el token y se guarda la contraseña nueva. */
export default function RecoverPasswordPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token');

    const [step, setStep] = useState(token ? 'validando' : 'correo');
    const [email, setEmail] = useState('');
    const [mailToken, setMailToken] = useState(null);
    const [pass, setPass] = useState({ a: '', b: '' });
    const [error, setError] = useState('');
    const [invalid, setInvalid] = useState([]);

    useEffect(() => {
        if (!token) {
            setStep('correo');
            return;
        }
        setStep('validando');
        checkResetToken(token).then(() => setStep('nueva'), () => setStep('usado'));
    }, [token]);

    async function sendLink(e) {
        e.preventDefault();
        if (!email.trim()) {
            setError('Ingrese su correo electrónico.');
            setInvalid(['email']);
            return;
        }
        try {
            const result = await requestPasswordReset(email.trim());
            setMailToken(result?.token || null);
            setError('');
            setInvalid([]);
            setStep('enviado');
        } catch (err) {
            setError(err.message);
            setInvalid(['email']);
        }
    }

    async function savePassword(e) {
        e.preventDefault();
        if (pass.a.length < 8 || pass.a !== pass.b) {
            setError('Las contraseñas no coinciden o tienen menos de 8 caracteres.');
            setInvalid(['a', 'b']);
            return;
        }
        try {
            await resetPassword(token, pass.a);
            setError('');
            setStep('listo');
        } catch (err) {
            if (err.status === 410) setStep('usado');
            else setError(err.message);
        }
    }

    function again() {
        setError('');
        setInvalid([]);
        setStep('correo');
        navigate('/recuperar', { replace: true });
    }

    let inner;
    if (step === 'correo') {
        inner = (
            <form className="frm" noValidate onSubmit={sendLink}>
                <h1>Recuperar contraseña</h1>
                <p className="lead" style={{ margin: 0 }}>Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>
                <div><Message kind="err">{error}</Message></div>
                <Field id="rc-email" label="Correo electrónico" type="email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} invalid={invalid.includes('email')} />
                <button className="btn btn-primary btn-block" type="submit">Enviar enlace</button>
                <p className="center"><Link className="linkbtn" to="/ingresar" style={{ minHeight: 32 }}>Volver a iniciar sesión</Link></p>
            </form>
        );
    } else if (step === 'enviado') {
        inner = (
            <div className="frm">
                <h1>Revisa tu correo</h1>
                <Message kind="ok">Le enviamos un enlace a su correo para recuperar la contraseña.</Message>
                {USE_MOCK && mailToken && (
                    <div className="mailbox">
                        <small>Correo simulado para {email}</small>
                        <b>BikeStore: recupera tu contraseña</b>
                        <small>El enlace dura 30 minutos y solo sirve una vez.</small>
                        <Link className="btn btn-dark btn-sm" to={`/recuperar?token=${mailToken}`}>Abrir el enlace de recuperación</Link>
                    </div>
                )}
                <p className="center"><button className="linkbtn" onClick={again} style={{ minHeight: 32 }}>Usar otro correo</button></p>
            </div>
        );
    } else if (step === 'validando') {
        inner = <div className="frm"><h1>Nueva contraseña</h1><p className="lead">Verificando el enlace…</p></div>;
    } else if (step === 'nueva') {
        inner = (
            <form className="frm" noValidate onSubmit={savePassword}>
                <h1>Nueva contraseña</h1>
                <div><Message kind="err">{error}</Message></div>
                <Field id="n-pass" label="Nueva contraseña" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres."
                    value={pass.a} onChange={(e) => setPass({ ...pass, a: e.target.value })} invalid={invalid.includes('a')} />
                <Field id="n-pass2" label="Confirmar la contraseña" type="password" autoComplete="new-password"
                    value={pass.b} onChange={(e) => setPass({ ...pass, b: e.target.value })} invalid={invalid.includes('b')} />
                <button className="btn btn-primary btn-block" type="submit">Guardar contraseña</button>
            </form>
        );
    } else if (step === 'usado') {
        inner = (
            <div className="frm">
                <h1>Enlace no válido</h1>
                <Message kind="err">El enlace ya no es válido. Solicite uno nuevo.</Message>
                <button className="btn btn-primary" onClick={again}>Solicitar un enlace nuevo</button>
            </div>
        );
    } else {
        inner = (
            <div className="frm">
                <h1>Contraseña actualizada</h1>
                <Message kind="ok">Su contraseña fue actualizada. Ya puede iniciar sesión.</Message>
                <Link className="btn btn-primary btn-block" to="/ingresar">Iniciar sesión</Link>
                <p className="center">
                    <button className="linkbtn" style={{ minHeight: 32 }} onClick={() => checkResetToken(token).then(() => setStep('nueva'), () => setStep('usado'))}>
                        Probar el mismo enlace otra vez
                    </button>
                </p>
            </div>
        );
    }

    return (
        <AuthShell productId={11} title="¿Se te olvidó?" text="Te ayudamos a recuperar tu cuenta en dos pasos.">
            {inner}
        </AuthShell>
    );
}
