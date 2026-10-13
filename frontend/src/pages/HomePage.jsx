import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import ProductCard from '../components/ProductCard';
import { ProductImage } from '../components/ui';
import { CATEGORIAS, TIPOS } from '../data/seed';
import { firstName, money, plural } from '../utils/format';

const HERO_BIKE = 4; // Ruta R8-4720 Carbono
const SPOTLIGHT = 1; // Bicicleta MTB R-5420
const FEATURED = [2, 10, 6, 5, 12, 8, 11, 9];
// la portada usa fotos preparadas para la demo; si el admin cambia la imagen, se usa la nueva
const hasDemoImage = (p) => String(p.imagen).startsWith('/img/');
const WORDS =CATEGORIAS.map((c) => c.nombre).concat(['Cascos', 'Luces', 'Herramientas', 'Ropa de ruta']);

// Portada: al hacer scroll el título se desvanece y la bicicleta crece (efecto «sala de exhibición»).
function useHeroScroll(refs) {
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        let ticking = false;
        function frame() {
            ticking = false;
            const { hero, copy, bike, scene, cue } = refs;
            if (!hero.current) return;
            const max = hero.current.offsetHeight - window.innerHeight;
            const p = Math.min(1, Math.max(0, window.scrollY / max));
            copy.current.style.transform = `translate3d(0,${-p * 70}px,0) scale(${1 - p * 0.12})`;
            copy.current.style.opacity = String(Math.max(0, 1 - p * 1.8));
            copy.current.style.filter = `blur(${p * p * 6}px)`;
            bike.current.style.transform = `translate3d(0,${-p * 14}vh,0) scale(${1 + p * 0.16})`;
            scene.current.style.transform = `scale(${1.04 + p * 0.1})`;
            cue.current.style.opacity = String(Math.max(0, 1 - p * 3));
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

    const byId = (id) => products.find((p) => p.id_producto === id);
    const bike = byId(HERO_BIKE) || products[0];
    const star = byId(SPOTLIGHT);
    const featured = FEATURED.map(byId).filter(Boolean).slice(0, 4);

    return (
        <div className="view">
            <section className="hero" id="hero" aria-label="Presentación" ref={refs.hero}>
                <div className="stage">
                    <div className="scene" aria-hidden="true" ref={refs.scene} />
                    <div className="hero-copy" ref={refs.copy}>
                        <h1 className="hero-title">
                            <span className="line"><span>Bicicletas para</span></span>
                            <span className="line"><span>rodar más lejos.</span></span>
                        </h1>
                        <p className="hero-sub">Montaña, ruta, urbanas e infantiles, con los accesorios para cada salida. Consulta el catálogo sin crear cuenta.</p>
                        <div className="hero-cta">
                            <Link className="btn btn-light" to="/catalogo">Ver el catálogo</Link>
                            {user
                                ? <Link className="btn btn-line-light" to="/cuenta">Mi cuenta</Link>
                                : <Link className="btn btn-line-light" to="/registro">Crear cuenta</Link>}
                        </div>
                    </div>
                    <Link className="hero-bike" ref={refs.bike} to={bike ? `/producto/${bike.id_producto}` : '/catalogo'} aria-label={bike ? `Ver ${bike.nombre}` : 'Ver el catálogo'}>
                        {!bike || (bike.id_producto === HERO_BIKE && hasDemoImage(bike))
                            ? <img src="/img/portada/bici-portada.webp" alt="" />
                            : <ProductImage product={bike} lazy={false} decorative />}
                    </Link>
                    <div className="cue" aria-hidden="true" ref={refs.cue}><i /><span>Desliza para ver más</span></div>
                </div>
            </section>

            <div className="marquee" aria-hidden="true">
                <div className="mq">
                    {WORDS.concat(WORDS).map((w, i) => <span key={i}>{w}</span>)}
                </div>
            </div>

            <section className="sec" id="categorias">
                <div className="wrap">
                    <div className="chead" data-reveal>
                        <h2 className="h2">Elige cómo vas a rodar.</h2>
                        <p>Cada categoría abre el catálogo ya filtrado. Después puedes ordenarlo por precio.</p>
                    </div>
                    <div className="ctiles">
                        {CATEGORIAS.map((c, i) => {
                            const n = products.filter((p) => p.categoria === c.id).length;
                            return (
                                <Link key={c.id} className={`ctile${i < 2 ? ' big' : ''}`} to={`/catalogo?categoria=${c.id}`} data-reveal style={{ '--d': `${i * 70}ms` }}>
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
                        {featured.map((p, i) => <ProductCard key={p.id_producto} product={p} index={i} />)}
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
