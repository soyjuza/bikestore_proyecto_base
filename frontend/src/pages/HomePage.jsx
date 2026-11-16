import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import BiciCubos from '../components/BiciCubos';
import ProductCard from '../components/ProductCard';
import { ProductImage } from '../components/ui';
import { CATEGORIAS, TIPOS } from '../data/seed';
import { firstName, money, plural } from '../utils/format';

const SPOTLIGHT = 1; // Bicicleta MTB R-5420
const FEATURED = [2, 10, 6, 5, 12, 8, 11, 9];
// la portada usa fotos preparadas para la demo; si el admin cambia la imagen, se usa la nueva
const hasDemoImage = (p) => String(p.imagen).startsWith('/img/');
const WORDS =CATEGORIAS.map((c) => c.nombre).concat(['Cascos', 'Luces', 'Herramientas', 'Ropa de ruta']);

// La portada va cambiando de paisaje (y con él el rótulo y el final del título);
// la bicicleta es siempre la de montaña, que al bajar se deshace en cubos.
const ESCENAS = [
    { id: 'montana', rotulo: 'Montaña', cola: 'la trocha.', foto: '/img/portada/paisaje-trocha.webp' },
    { id: 'ruta', rotulo: 'Ruta', cola: 'la carretera.', foto: '/img/portada/paisaje-carretera.webp' },
    { id: 'urbana', rotulo: 'Urbana', cola: 'la ciudad.', foto: '/img/portada/paisaje-ciudad.webp' },
    { id: 'ninos', rotulo: 'Niños', cola: 'el parque.', foto: '/img/portada/paisaje-parque.webp' }
];
const BICI_PORTADA = { id: 1, recorte: '/img/recortes/p01.webp' }; // Bicicleta MTB R-5420
const TURNO = 6000; // lo que dura cada paisaje en pantalla

const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cambia de escena sola cada TURNO. Se detiene si la portada no está en pantalla,
// si el usuario cambió de pestaña o si él mismo le dio pausa.
function useCarrusel(total, heroRef) {
    const [i, setI] = useState(0);
    const [pausa, setPausa] = useState(false);
    const [enPantalla, setEnPantalla] = useState(true);
    const [pestanaViva, setPestanaViva] = useState(true);

    useEffect(() => {
        const el = heroRef.current;
        if (!el || !('IntersectionObserver' in window)) return undefined;
        const io = new IntersectionObserver(([e]) => setEnPantalla(e.isIntersecting), { threshold: 0.15 });
        io.observe(el);
        return () => io.disconnect();
    }, [heroRef]);

    useEffect(() => {
        const ver = () => setPestanaViva(!document.hidden);
        document.addEventListener('visibilitychange', ver);
        return () => document.removeEventListener('visibilitychange', ver);
    }, []);

    const corriendo = !pausa && enPantalla && pestanaViva && !sinMovimiento();

    useEffect(() => {
        if (!corriendo) return undefined;
        const t = setTimeout(() => setI((v) => (v + 1) % total), TURNO);
        return () => clearTimeout(t);
    }, [i, corriendo, total]);

    const ir = useCallback((k) => setI(((k % total) + total) % total), [total]);
    return { i, ir, pausa, setPausa };
}

// Portada: al hacer scroll el título se desvanece y el paisaje se acerca;
// la bicicleta se deshace en cubos (eso lo maneja BiciCubos con el mismo recorrido).
function useHeroScroll(refs) {
    useEffect(() => {
        if (sinMovimiento()) return undefined;
        let ticking = false;
        function frame() {
            ticking = false;
            const { hero, copy, scene, cue } = refs;
            if (!hero.current || !copy.current || !scene.current) return;
            const max = hero.current.offsetHeight - window.innerHeight;
            const p = Math.min(1, Math.max(0, window.scrollY / max));
            copy.current.style.transform = `translate3d(0,${-p * 70}px,0) scale(${1 - p * 0.12})`;
            copy.current.style.opacity = String(Math.max(0, 1 - p * 2.6));
            copy.current.style.filter = `blur(${p * p * 6}px)`;
            scene.current.style.transform = `scale(${1.04 + p * 0.1})`;
            if (cue.current) cue.current.style.opacity = String(Math.max(0, 1 - p * 3));
        }
        function onScroll() {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(frame);
            }
        }
        frame();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', frame);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', frame);
        };
    }, [refs]);
}

export default function HomePage() {
    const { user } = useAuth();
    const { products, add } = useCart();
    const refs = useRef({ hero: { current: null }, copy: { current: null }, bike: { current: null }, scene: { current: null }, cue: { current: null } }).current;
    useHeroScroll(refs);
    const { i, ir, pausa, setPausa } = useCarrusel(ESCENAS.length, refs.hero);
    // mientras el efecto de cubos funcione, la foto normal se oculta (sigue ahí como enlace y respaldo)
    const [cubos, setCubos] = useState(false);

    // solo se piden las fotos que ya se vieron y la de la escena siguiente
    const [cargadas, setCargadas] = useState(() => new Set([0]));
    useEffect(() => {
        setCargadas((s) => (s.has(i) ? s : new Set(s).add(i)));
        const sig = (i + 1) % ESCENAS.length;
        const t = setTimeout(() => setCargadas((s) => (s.has(sig) ? s : new Set(s).add(sig))), 1500);
        return () => clearTimeout(t);
    }, [i]);

    const byId = (id) => products.find((p) => p.id_producto === id);
    const escena = ESCENAS[i];
    const biciPortada = byId(BICI_PORTADA.id);
    const star = byId(SPOTLIGHT);
    const featured = FEATURED.map(byId).filter(Boolean).slice(0, 4);

    return (
        <div className="view">
            <section className="hero" id="hero" aria-label="Presentación" ref={refs.hero}>
                <div className="stage">
                    <div className="scenes" aria-hidden="true" ref={refs.scene}>
                        {ESCENAS.map((e, k) => (
                            <div
                                key={e.id}
                                className={`scene${k === i ? ' on' : ''}`}
                                style={cargadas.has(k) ? { backgroundImage: `url(${e.foto})` } : undefined}
                            />
                        ))}
                    </div>

                    <div className="hero-copy" ref={refs.copy}>
                        <p className="hero-kicker"><span key={escena.id}>{escena.rotulo}</span></p>
                        <h1 className="hero-title">
                            <span className="line"><span>Bicicletas para</span></span>
                            <span className="line"><span key={escena.id}>{escena.cola}</span></span>
                        </h1>
                        <p className="hero-sub">Montaña, ruta, urbanas e infantiles, con los accesorios para cada salida. Consulta el catálogo sin crear cuenta.</p>
                        <div className="hero-cta">
                            <Link className="btn btn-light" to="/catalogo">Ver el catálogo</Link>
                            {user
                                ? <Link className="btn btn-line-light" to="/cuenta">Mi cuenta</Link>
                                : <Link className="btn btn-line-light" to="/registro">Crear cuenta</Link>}
                        </div>
                    </div>

                    <BiciCubos src={BICI_PORTADA.recorte} hueco={refs.bike} portada={refs.hero} onListo={setCubos} />
                    <div className={`hero-bikes${cubos ? ' cubos' : ''}`} ref={refs.bike}>
                        <Link
                            className="hero-bike on"
                            to={biciPortada ? `/producto/${biciPortada.id_producto}` : '/catalogo?categoria=montana'}
                            aria-label={biciPortada ? `Ver ${biciPortada.nombre}` : 'Ver bicicletas de montaña'}
                        >
                            <img src={BICI_PORTADA.recorte} alt="" decoding="async" />
                        </Link>
                    </div>

                    <div className={`scene-nav${pausa ? ' pausa' : ''}`}>
                        <button
                            type="button"
                            className="nav-play"
                            onClick={() => setPausa((p) => !p)}
                            aria-label={pausa ? 'Reanudar el cambio de paisajes' : 'Pausar el cambio de paisajes'}
                        >
                            {pausa
                                ? <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0l10 6-10 6z" fill="currentColor" /></svg>
                                : <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0h3v12H0zM7 0h3v12H7z" fill="currentColor" /></svg>}
                        </button>
                        {ESCENAS.map((e, k) => (
                            <button
                                key={e.id}
                                type="button"
                                className={`nav-dot${k === i ? ' on' : ''}`}
                                onClick={() => ir(k)}
                                aria-label={`Ver el paisaje de ${e.rotulo.toLowerCase()}`}
                                aria-current={k === i}
                            >
                                <i key={`${i}-${pausa}`} style={{ animationDuration: `${TURNO}ms` }} />
                            </button>
                        ))}
                    </div>

                    <div className="cue" aria-hidden="true" ref={refs.cue}><i /><span>Desliza para ver más</span></div>
                </div>
            </section>

            <div className="marquee" aria-hidden="true">
                <div className="mq">
                    {WORDS.concat(WORDS).map((w, k) => <span key={k}>{w}</span>)}
                </div>
            </div>

            <section className="sec" id="categorias">
                <div className="wrap">
                    <div className="chead" data-reveal>
                        <h2 className="h2">Elige cómo vas a rodar.</h2>
                        <p>Cada categoría abre el catálogo ya filtrado. Después puedes ordenarlo por precio.</p>
                    </div>
                    <div className="ctiles">
                        {CATEGORIAS.map((c, k) => {
                            const n = products.filter((p) => p.categoria === c.id).length;
                            return (
                                <Link key={c.id} className={`ctile${k < 2 ? ' big' : ''}`} to={`/catalogo?categoria=${c.id}`} data-reveal style={{ '--d': `${k * 70}ms` }}>
                                    <span className="ctile-img"><ProductImage product={byId(c.foto)} decorative /></span>
                                    <span className="ctile-txt"><b>{c.nombre}</b><small>{n} {plural(n, 'producto', 'productos')}</small></span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {star && (
                <section className="spot" aria-labelledby="spot-t">
                    <div className="wrap spot-in">
                        <Link className="spot-img" to={`/producto/${star.id_producto}`} data-reveal aria-label={`Ver ${star.nombre}`}>
                            {hasDemoImage(star)
                                ? <img src="/img/portada/destacada-p01.webp" alt="" loading="lazy" />
                                : <ProductImage product={star} decorative />}
                        </Link>
                        <div className="spot-copy" data-reveal style={{ '--d': '120ms' }}>
                            <p className="spot-k">{TIPOS[star.categoria]}</p>
                            <h2 className="h2" id="spot-t">{star.nombre}</h2>
                            <p className="spot-p">Doble suspensión para sendero técnico: sube liviana y baja con control.</p>
                            <dl className="specs-big">
                                <div><dt>Recorrido</dt><dd>120 mm</dd></div>
                                <div><dt>Transmisión</dt><dd>1×12</dd></div>
                                <div><dt>Aro</dt><dd>29"</dd></div>
                                <div><dt>Frenos</dt><dd>Hidráulicos</dd></div>
                            </dl>
                            <div className="spot-buy">
                                <span className="spot-price">{money(star.precio)}</span>
                                <Link className="btn btn-light" to={`/producto/${star.id_producto}`}>Ver detalles</Link>
                                {star.stock > 0 && <button className="btn btn-line-light" onClick={() => add(star, 1)}>Agregar al carrito</button>}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <section className="sec">
                <div className="wrap">
                    <div className="chead" data-reveal>
                        <h2 className="h2">Destacados</h2>
                        <Link className="linkbtn" to="/catalogo">Ver todo el catálogo</Link>
                    </div>
                    <div className="grid g4">
                        {featured.map((p, k) => <ProductCard key={p.id_producto} product={p} index={k} />)}
                    </div>
                </div>
            </section>

            <section className="sec sec-tight">
                <div className="wrap">
                    <div className="chead" data-reveal>
                        <h2 className="h2">Comprar toma tres pasos.</h2>
                        <p>Sin cuenta puedes mirar y llenar el carrito. Para pagar te pedimos iniciar sesión.</p>
                    </div>
                    <ol className="steps">
                        <li className="step" data-reveal style={{ '--d': '0ms' }}><b>1</b><h3>Explora</h3><p>Filtra por categoría, ordena por precio y abre el detalle de cada producto.</p></li>
                        <li className="step" data-reveal style={{ '--d': '100ms' }}><b>2</b><h3>Arma tu carrito</h3><p>Cambia cantidades cuando quieras. El carrito queda guardado en tu cuenta.</p></li>
                        <li className="step" data-reveal style={{ '--d': '200ms' }}><b>3</b><h3>Paga</h3><p>Revisa el resumen, paga y sigue tu pedido desde Mi cuenta.</p></li>
                    </ol>
                </div>
            </section>

            <section className="closing">
                <div className="closing-bg" aria-hidden="true" />
                <div className="wrap closing-in">
                    {user ? (
                        <>
                            <h2 className="h2" data-reveal>Hola, {firstName(user.nombre)}. Tus pedidos están en tu cuenta.</h2>
                            <p data-reveal>Consulta el estado de cada compra, tus datos y tu contraseña desde Mi cuenta.</p>
                            <div className="row" data-reveal>
                                <Link className="btn btn-light" to="/cuenta">Ver mis pedidos</Link>
                                <Link className="btn btn-line-light" to="/catalogo">Seguir comprando</Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="h2" data-reveal>Tu carrito te espera cuando vuelvas.</h2>
                            <p data-reveal>Crea tu cuenta con nombre, correo y contraseña. El carrito queda guardado y tus pedidos quedan en tu cuenta.</p>
                            <div className="row" data-reveal>
                                <Link className="btn btn-light" to="/registro">Crear cuenta</Link>
                                <Link className="btn btn-line-light" to="/ingresar">Ya tengo cuenta</Link>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
