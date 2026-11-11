import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Field, Message, PasswordRules } from '../components/ui';
import { WEAK_PASSWORD, isStrongPassword } from '../utils/password';
import { checkResetToken, requestPasswordReset, resetPassword } from '../services/auth.service';
import { USE_MOCK } from '../config/env';

/* RF-16: recuperar contraseña en dos pasos.
   1) /recuperar            -> se pide el correo y el backend envía un enlace con un token de un solo uso (30 min).
   2) /recuperar#token=...  -> se valida el token y se guarda la contraseña nueva.
   El token llega después de # porque esa parte nunca sale del navegador (no queda en registros de servidores).
   También se acepta ?token=... por los enlaces que se hayan enviado antes del cambio. */
export default function RecoverPasswordPage() {
    const [params] = useSearchParams();
    const { hash } = useLocation();
    const navigate = useNavigate();
    const token = new URLSearchParams(hash.slice(1)).get('token') || params.get('token');

    const [step, setStep] = useState(token ? 'validando' : 'correo');
    const [email, setEmail] = useState('');
    const [mailToken, setMailToken] = useState(null);
    const [pass, setPass] = useState({ a: '', b: '' });
    const [error, setError] = useState('');
    const [invalid, setInvalid] = useState([]);
    // Mientras una petición está en camino el botón no responde: un segundo clic gastaría el enlace
    // dos veces y mostraría «El enlace ya no es válido» antes del mensaje correcto.
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);

    async function once(work) {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        try {
            await work();
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }

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
        await once(async () => {
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
        });
    }

    async function savePassword(e) {
        e.preventDefault();
        if (!isStrongPassword(pass.a)) {
            setError(WEAK_PASSWORD);
            setInvalid(['a']);
            return;
        }
        if (pass.a !== pass.b) {
            setError('Las contraseñas no coinciden.');
            setInvalid(['b']);
            return;
        }
        await once(async () => {
            try {
                await resetPassword(token, pass.a);
                setError('');
                setStep('listo');
            } catch (err) {
                if (err.status === 410) setStep('usado');
                else setError(err.message);
            }
        });
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
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
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
                        <Link className="btn btn-dark btn-sm" to={`/recuperar#token=${mailToken}`}>Abrir el enlace de recuperación</Link>
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
                <div className="pfield">
                    <Field id="n-pass" label="Nueva contraseña" type="password" autoComplete="new-password" aria-describedby="n-pass-rules"
                        value={pass.a} onChange={(e) => setPass({ ...pass, a: e.target.value })} invalid={invalid.includes('a')} />
                    <PasswordRules id="n-pass-rules" value={pass.a} />
                </div>
                <Field id="n-pass2" label="Confirmar la contraseña" type="password" autoComplete="new-password"
                    value={pass.b} onChange={(e) => setPass({ ...pass, b: e.target.value })} invalid={invalid.includes('b')} />
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
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
