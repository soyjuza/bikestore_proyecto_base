import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useReveal } from '../hooks/useReveal';

const TITLES = {
    '': 'BikeStore, bicicletas y accesorios',
    catalogo: 'Catálogo | BikeStore',
    producto: 'Producto | BikeStore',
    carrito: 'Carrito | BikeStore',
    pago: 'Pago | BikeStore',
    cuenta: 'Mi cuenta | BikeStore',
    admin: 'Tablero | BikeStore',
    ingresar: 'Iniciar sesión | BikeStore',
    registro: 'Crear cuenta | BikeStore'
};

// Encabezado + página + pie. También maneja la barra de progreso y el encabezado transparente sobre la portada.
export default function Layout() {
    const { pathname } = useLocation();
    const mainRef = useRef(null);
    const progressRef = useRef(null);
    const [ontop, setOntop] = useState(false);
    const section = pathname.split('/')[1] || '';

    useReveal(mainRef);

    useLayoutEffect(() => {
        document.body.dataset.route = section === '' ? 'home' : section;
        document.body.dataset.area = section === 'admin' ? 'admin' : 'shop';
        document.title = TITLES[section] || 'BikeStore';
    }, [section]);

    // al cambiar de página se vuelve arriba (los filtros del catálogo solo cambian la query y no mueven el scroll)
    useEffect(() => {
        window.scrollTo(0, 0);
        try {
            mainRef.current?.focus({ preventScroll: true });
        } catch {
            // navegadores sin preventScroll
        }
    }, [pathname]);

    useEffect(() => {
        let ticking = false;
        function frame() {
            ticking = false;
            const y = window.scrollY;
            const hero = document.getElementById('hero');
            setOntop(!!hero && y < hero.offsetHeight - 76);
            const doc = document.documentElement.scrollHeight - window.innerHeight;
            if (progressRef.current) progressRef.current.style.width = (doc > 0 ? (y / doc) * 100 : 0) + '%';
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
    }, [pathname]);

    return (
        <>
            <div className="progress" ref={progressRef} />
            <Navbar ontop={ontop} />
            <main id="view" tabIndex={-1} ref={mainRef}>
                <Outlet />
            </main>
            <Footer />
        </>
    );
}
