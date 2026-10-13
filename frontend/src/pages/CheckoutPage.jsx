import { Fragment, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import PaymentAnimation from '../components/PaymentAnimation';
import { Breadcrumbs, EmptyState, Field, Message } from '../components/ui';
import { IconOk } from '../components/Icons';
import { createOrder } from '../services/orders.service';
import { dateCO, money } from '../utils/format';

const STEPS = [['resumen', 'Resumen'], ['datos', 'Pago y envío'], ['ok', 'Confirmación']];
const MIN_ANIMATION = 3400; // la animación de pago dura al menos esto aunque la API responda antes

function Flow({ step }) {
    const idx = STEPS.findIndex(([k]) => k === step);
    return (
        <div className="flow" aria-label="Pasos del pago">
            {STEPS.map(([k, label], i) => (
                <Fragment key={k}>
                    {i > 0 && <em />}
                    <span className={i < idx ? 'done' : i === idx ? 'on' : ''} aria-current={i === idx ? 'step' : undefined}>
                        <i>{i < idx ? '✓' : i + 1}</i>{label}
                    </span>
                </Fragment>
            ))}
        </div>
    );
}

const EMPTY_FORM = { titular: '', numero: '', vence: '', cvv: '', direccion: '', ciudad: '', telefono: '' };

function validate(f) {
    const empty = Object.keys(f).filter((k) => !f[k].trim());
    if (empty.length) return ['Faltan datos de pago o de envío. Complete los campos marcados.', empty];
    const num = f.numero.replace(/\D/g, '');
    if (num.length < 12 || num.length > 19) return ['El número de tarjeta o cuenta debe tener entre 12 y 19 dígitos.', ['numero']];
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(f.vence.trim())) return ['Escriba el vencimiento con el formato MM/AA, por ejemplo 08/29.', ['vence']];
    if (!/^\d{3,4}$/.test(f.cvv.trim())) return ['El código de seguridad tiene 3 o 4 dígitos.', ['cvv']];
    if (f.telefono.replace(/\D/g, '').length < 7) return ['Escriba un número de celular válido.', ['telefono']];
    return null;
}

// RF-09..12: resumen, pago simulado, número único de pedido y confirmación
export default function CheckoutPage() {
    const { user } = useAuth();
    const { lines, total, reloadCart, refreshProducts } = useCart();
    const [step, setStep] = useState('resumen');
    const [form, setForm] = useState(() => ({ ...EMPTY_FORM, titular: user.nombre }));
    const [error, setError] = useState('');
    const [invalid, setInvalid] = useState([]);
    const [paying, setPaying] = useState(false);
    const [payResult, setPayResult] = useState(null);
    const [order, setOrder] = useState(null);
    const outcome = useRef(null);
    const formRef = useRef(null);

    function change(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function fail(message, fields) {
        setError(message);
        setInvalid(fields);
        const first = fields[0] && formRef.current?.querySelector(`[name="${fields[0]}"]`);
        if (first) first.focus();
    }

    async function pay(e) {
        e.preventDefault();
        if (paying) return;
        const problem = validate(form);
        if (problem) return fail(...problem);
        setError('');
        setInvalid([]);
        setPaying(true);
        setPayResult(null);

        const [result] = await Promise.allSettled([
            createOrder({ direccion: form.direccion.trim(), ciudad: form.ciudad.trim(), telefono: form.telefono.trim(), numeroCuenta: form.numero }),
            new Promise((r) => setTimeout(r, MIN_ANIMATION))
        ]);
        outcome.current = result;
        setPayResult(result.status === 'fulfilled' ? 'ok' : 'err');
    }

    // se llama cuando la animación termina de frenar
    async function afterAnimation() {
        const result = outcome.current;
        setPaying(false);
        setPayResult(null);
        if (result.status === 'rejected') {
            fail(result.reason.message, result.reason.status === 402 ? ['numero'] : []);
            refreshProducts();
            return;
        }
        setOrder(result.value);
        setStep('ok');
        window.scrollTo(0, 0);
        await Promise.all([reloadCart(), refreshProducts()]);
    }

    const animation = paying && <PaymentAnimation result={payResult} onFinished={afterAnimation} />;

    if (step === 'ok' && order) {
        return (
            <div className="view">
                <section className="wrap ok-page">
                    <div className="check"><IconOk size={36} /></div>
                    <Flow step="ok" />
                    <h1 className="h1" style={{ marginTop: 12 }}>Gracias por tu compra</h1>
                    <p className="lead" style={{ margin: 0 }}>Tu pago fue procesado correctamente. Guarda tu número de pedido:</p>
                    <p className="ordno">{order.numero}</p>
                    <div className="box order">
                        {order.items.map((l) => (
                            <div className="kv" key={l.id_producto}><span>{l.cantidad} × {l.nombre}</span><strong>{money(l.precio * l.cantidad)}</strong></div>
                        ))}
                        <hr className="hr" />
                        <div className="kv"><span>Fecha</span><strong>{dateCO(order.fecha)}</strong></div>
                        <div className="kv"><span>Envío a</span><strong>{order.direccion}, {order.ciudad}</strong></div>
                        <div className="kv"><span>Pagado con</span><strong>Cuenta terminada en {order.ultimos4}</strong></div>
                        <div className="kv tot"><span>Total pagado</span><strong>{money(order.total)}</strong></div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Link className="btn btn-primary" to={`/cuenta/pedido/${order.numero}`}>Ver mi pedido</Link>
                        <Link className="btn btn-outline" to="/catalogo">Seguir comprando</Link>
                    </div>
                </section>
            </div>
        );
    }

    const head = (
        <section className="wrap pagehead">
            <Breadcrumbs items={[['/', 'Inicio'], ['/carrito', 'Carrito'], ['/pago', 'Pago']]} />
            <h1 className="h1">{step === 'resumen' ? 'Resumen del pedido' : 'Pago y envío'}</h1>
            <Flow step={step} />
        </section>
    );

    if (!lines.length && !paying) {
        return (
            <div className="view">
                {head}
                <section className="wrap" style={{ paddingBlock: '24px 96px' }}>
                    <EmptyState title="Tu carrito está vacío" action={<Link className="btn btn-primary" to="/catalogo">Ir al catálogo</Link>}>
                        No hay productos para pagar. Agrega productos desde el catálogo.
                    </EmptyState>
                </section>
            </div>
        );
    }

    const side = (
        <aside className="box sum" aria-label="Total del pedido">
            <h2>Tu pedido</h2>
            {lines.map((l) => (
                <div className="kv" key={l.id_producto}><span>{l.cantidad} × {l.product.nombre}</span><strong>{money(l.product.precio * l.cantidad)}</strong></div>
            ))}
            <hr className="hr" />
            <div className="kv tot"><span>Total</span><strong>{money(total)}</strong></div>
            <p className="fine">Comprando como {user.nombre} ({user.email}).</p>
        </aside>
    );

    if (step === 'resumen') {
        return (
            <div className="view">
                {head}
                <section className="wrap cgrid">
                    <div className="box" style={{ padding: 28 }}>
                        <table className="otable">
                            <thead><tr><th>Producto</th><th className="num">Cantidad</th><th className="num">Valor</th></tr></thead>
                            <tbody>
                                {lines.map((l) => (
                                    <tr key={l.id_producto}>
                                        <td>{l.product.nombre}<br /><span className="meta">{money(l.product.precio)} c/u</span></td>
                                        <td className="num">{l.cantidad}</td>
                                        <td className="num">{money(l.product.precio * l.cantidad)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="kv tot" style={{ marginTop: 20 }}><span>Total a pagar</span><strong>{money(total)}</strong></div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                            <Link className="linkbtn" to="/carrito">Modificar el carrito</Link>
                            <button className="btn btn-primary" onClick={() => { setStep('datos'); window.scrollTo(0, 0); }}>Continuar al pago</button>
                        </div>
                    </div>
                    {side}
                </section>
            </div>
        );
    }

    const f = (name, label, props = {}, hint) => (
        <Field id={`y-${name}`} name={name} label={label} value={form[name]} onChange={change} invalid={invalid.includes(name)} hint={hint} {...props} />
    );

    return (
        <div className="view">
            {head}
            <section className="wrap cgrid">
                <form className="box frm" ref={formRef} noValidate style={{ padding: 30 }} onSubmit={pay}>
                    <Message kind="err">{error}</Message>
                    <fieldset>
                        <legend className="fs-title">Datos de la cuenta</legend>
                        {f('titular', 'Titular', { autoComplete: 'cc-name' })}
                        {f('numero', 'Número de tarjeta o cuenta', { inputMode: 'numeric', autoComplete: 'cc-number', placeholder: '0000 0000 0000 0000' },
                            'Pago simulado: ningún dato se envía a un banco. Para ver un pago rechazado usa un número que termine en 0000.')}
                        <div className="two">
                            {f('vence', 'Vencimiento (MM/AA)', { inputMode: 'numeric', autoComplete: 'cc-exp', placeholder: '08/29' })}
                            {f('cvv', 'Código de seguridad', { type: 'password', inputMode: 'numeric', autoComplete: 'cc-csc', maxLength: 4 })}
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="fs-title">Dirección de envío</legend>
                        {f('direccion', 'Dirección', { autoComplete: 'street-address', placeholder: 'Calle 30 # 28-14' })}
                        <div className="two">
                            {f('ciudad', 'Ciudad', { autoComplete: 'address-level2' })}
                            {f('telefono', 'Celular', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
                        </div>
                    </fieldset>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button type="button" className="linkbtn" onClick={() => setStep('resumen')}>Volver al resumen</button>
                        <button className="btn btn-primary" type="submit" disabled={paying}>
                            {paying ? <><span className="spin" />Procesando el pago…</> : `Pagar ${money(total)}`}
                        </button>
                    </div>
                </form>
                {side}
            </section>
            {animation}
        </div>
    );
}
