import { useEffect, useRef, useState } from 'react';

const CHAIN = 'M196 274H232A118 118 0 0 1 232 510H62';
const SPOKES = 'M257 140L332 140M256.5 144.2L329.6 160.9M255.1 148.2L322.7 180.8M252.9 151.8L311.5 198.6M249.8 154.9L296.6 213.5M246.2 157.1L278.8 224.7M242.2 158.5L258.9 231.6M238 159L238 234M233.8 158.5L217.1 231.6M229.8 157.1L197.2 224.7M226.2 154.9L179.4 213.5M223.1 151.8L164.5 198.6M220.9 148.2L153.3 180.8M219.5 144.2L146.4 160.9M219 140L144 140M219.5 135.8L146.4 119.1M220.9 131.8L153.3 99.2M223.1 128.2L164.5 81.4M226.2 125.1L179.4 66.5M229.8 122.9L197.2 55.3M233.8 121.5L217.1 48.4M238 121L238 46M242.2 121.5L258.9 48.4M246.2 122.9L278.8 55.3M249.8 125.1L296.6 66.5M252.9 128.2L311.5 81.4M255.1 131.8L322.7 99.2M256.5 135.8L329.6 119.1';
const TEETH = 'M222.6 306.5 L226.4 295.2 L237.6 295.2 L241.4 306.5 L245 307 L251.7 297 L262.5 299.9 L263.2 311.9 L266.6 313.3 L275.6 305.3 L285.3 310.9 L282.9 322.7 L285.8 324.9 L296.5 319.6 L304.4 327.5 L299.1 338.2 L301.3 341.1 L313.1 338.7 L318.7 348.4 L310.7 357.4 L312.1 360.8 L324.1 361.5 L327 372.3 L317 379 L317.5 382.6 L328.8 386.4 L328.8 397.6 L317.5 401.4 L317 405 L327 411.7 L324.1 422.5 L312.1 423.2 L310.7 426.6 L318.7 435.6 L313.1 445.3 L301.3 442.9 L299.1 445.8 L304.4 456.5 L296.5 464.4 L285.8 459.1 L282.9 461.3 L285.3 473.1 L275.6 478.7 L266.6 470.7 L263.2 472.1 L262.5 484.1 L251.7 487 L245 477 L241.4 477.5 L237.6 488.8 L226.4 488.8 L222.6 477.5 L219 477 L212.3 487 L201.5 484.1 L200.8 472.1 L197.4 470.7 L188.4 478.7 L178.7 473.1 L181.1 461.3 L178.2 459.1 L167.5 464.4 L159.6 456.5 L164.9 445.8 L162.7 442.9 L150.9 445.3 L145.3 435.6 L153.3 426.6 L151.9 423.2 L139.9 422.5 L137 411.7 L147 405 L146.5 401.4 L135.2 397.6 L135.2 386.4 L146.5 382.6 L147 379 L137 372.3 L139.9 361.5 L151.9 360.8 L153.3 357.4 L145.3 348.4 L150.9 338.7 L162.7 341.1 L164.9 338.2 L159.6 327.5 L167.5 319.6 L178.2 324.9 L181.1 322.7 L178.7 310.9 L188.4 305.3 L197.4 313.3 L200.8 311.9 L201.5 299.9 L212.3 297 L219 307Z';
const ARMS = 'M246.5 323.5 A70 70 0 0 1 292.7 357.1 L261.5 375 A34 34 0 0 0 239 358.7ZM301.6 384.6 A70 70 0 0 1 284 438.9 L257.2 414.8 A34 34 0 0 0 265.8 388.4ZM260.5 455.9 A70 70 0 0 1 203.5 455.9 L218.1 423 A34 34 0 0 0 245.9 423ZM180 438.9 A70 70 0 0 1 162.4 384.6 L198.2 388.4 A34 34 0 0 0 206.8 414.8ZM171.3 357.1 A70 70 0 0 1 217.5 323.5 L225 358.7 A34 34 0 0 0 202.5 375Z';

/* Animación del pago: el logo redibujado en SVG. Un solo reloj mueve rueda, plato y cadena para que vayan sincronizados;
   la cadena avanza lo mismo que gira el borde del plato y la rueda da 2,2 vueltas por cada vuelta del plato.
   Mientras `result` es null la bici pedalea; cuando llega 'ok' o 'err' frena, muestra el texto y llama a onFinished. */
export default function PaymentAnimation({ result, onFinished }) {
    const [shown, setShown] = useState(false);
    const rueda = useRef(null);
    const plato = useRef(null);
    const mov = useRef([]);
    const target = useRef(360 / 5);
    const stopping = useRef(false);
    const finished = useRef(onFinished);
    finished.current = onFinished;

    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    useEffect(() => {
        const id = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(id);
    }, []);

    function close() {
        setTimeout(() => {
            setShown(false);
            setTimeout(() => finished.current?.(), 300);
        }, quiet ? 700 : 350);
    }

    useEffect(() => {
        if (quiet) return undefined;
        const RADIO_CADENA = 118;
        const RELACION = 2.2;
        let ang = 0;
        let vel = 0;
        let before = performance.now();
        let raf;
        function frame(t) {
            const dt = Math.min((t - before) / 1000, 0.05);
            before = t;
            vel += (target.current - vel) * Math.min(dt * (stopping.current ? 4 : 2.2), 1); // arranca suave y frena al terminar
            ang = (ang + vel * dt) % (360 * 24);
            plato.current.style.transform = `rotate(${ang}deg)`;
            rueda.current.style.transform = `rotate(${ang * RELACION}deg)`;
            const avance = -(ang * Math.PI / 180) * RADIO_CADENA;
            mov.current[0].style.strokeDashoffset = avance;
            mov.current[1].style.strokeDashoffset = avance - 19.5;
            mov.current[2].style.strokeDashoffset = avance - 19.5;
            if (stopping.current && vel < 2) {
                close();
                return;
            }
            raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!result) return;
        if (quiet) close();
        else {
            target.current = 0;
            stopping.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result]);

    const text = result === 'ok' ? 'Pago aprobado' : result === 'err' ? 'Pago rechazado' : 'Procesando tu pago';

    return (
        <div className={`payov${shown ? ' show' : ''}`} role="status">
            <svg viewBox="0 0 390 542" aria-hidden="true">
                <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path strokeWidth="8" d="M22 45H112M37 24V45M30 31H44M50 45Q50 58 64 58H70Q84 58 84 45M82 36V45" />
                    <path strokeWidth="7" d="M44 58C44 70 64 70 64 84V214M86 58C94 68 100 72 100 86V214" />
                    <rect x="48" y="214" width="68" height="26" rx="4" strokeWidth="7" />
                    <circle cx="62" cy="227" r="3.5" fill="currentColor" stroke="none" />
                    <path strokeWidth="6" d="M72 240V500M92 240V500" />
                    <path strokeWidth="7" d="M108 240V250Q108 258 116 258H200M170 286H124Q112 286 112 298V494" />
                    <g className="pa-rueda" ref={rueda}>
                        <circle cx="238" cy="140" r="114" strokeWidth="9" />
                        <circle cx="238" cy="140" r="101" strokeWidth="4" />
                        <circle cx="238" cy="140" r="94" strokeWidth="4" />
                        <path strokeWidth="3" d={SPOKES} />
                        <circle cx="238" cy="140" r="18" strokeWidth="6" />
                        <circle cx="238" cy="140" r="6" strokeWidth="4" />
                        <path stroke="#C1272D" strokeWidth="7" d="M238 49V64" />
                    </g>
                    <g className="pa-plato" ref={plato}>
                        <path strokeWidth="6" d={TEETH} />
                        <path strokeWidth="6" d={ARMS} />
                        <g fill="none" strokeWidth="4">
                            <circle cx="232" cy="332" r="5" />
                            <circle cx="289.1" cy="373.5" r="5" />
                            <circle cx="267.3" cy="440.5" r="5" />
                            <circle cx="196.7" cy="440.5" r="5" />
                            <circle cx="174.9" cy="373.5" r="5" />
                        </g>
                    </g>
                    <g className="pa-cadena">
                        <path className="pa-cad-base" strokeWidth="22" d={CHAIN} />
                        <path ref={(el) => { mov.current[0] = el; }} stroke="var(--fondo)" strokeWidth="11" strokeDasharray="15 9" d={CHAIN} />
                        <path ref={(el) => { mov.current[1] = el; }} strokeWidth="13" strokeDasharray="0 24" d={CHAIN} />
                        <path ref={(el) => { mov.current[2] = el; }} stroke="var(--fondo)" strokeWidth="4.5" strokeDasharray="0 24" d={CHAIN} />
                    </g>
                </g>
            </svg>
            <p>{text}</p>
            <small style={{ visibility: result ? 'hidden' : 'visible' }}>No cierres ni recargues esta página.</small>
        </div>
    );
}
