import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useLogout } from '../hooks/useLogout';
import { IconBag, IconMenu } from './Icons';
import { firstName } from '../utils/format';

export default function Navbar({ ontop }) {
    const { user, isAdmin } = useAuth();
    const { count, bump } = useCart();
    const logout = useLogout();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const badgeRef = useRef(null);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // reinicia la animación del contador cada vez que se agrega algo
    useEffect(() => {
        const b = badgeRef.current;
        if (!bump || !b) return;
        b.classList.remove('bump');
        void b.offsetWidth;
        b.classList.add('bump');
    }, [bump]);

    const links = [['/', 'Inicio'], ['/catalogo', 'Catálogo']];
    if (user) links.push(['/cuenta', 'Mi cuenta']);
    if (isAdmin) links.push(['/admin', 'Panel admin']);

    function isCurrent(to) {
        if (to === '/') return pathname === '/';
        if (to === '/catalogo') return pathname === '/catalogo' || pathname.startsWith('/producto');
        return pathname.startsWith(to);
    }

    return (
        <header className={`hdr${ontop ? ' ontop' : ''}${open ? ' open' : ''}`}>
            <div className="wrap hrow">
                <Link className="logo" to="/" aria-label="BikeStore, ir al inicio">
                    <img className="iso" src="/img/marca/isotipo.png" alt="" />
                    <img className="iso iso-claro" src="/img/marca/isotipo-claro.png" alt="" />
                    <span>BikeStore</span>
                </Link>

                <div className="hpanel" id="hpanel">
                    <nav className="hnav" aria-label="Principal">
                        {links.map(([to, label]) => (
                            <Link key={to} className="navlink" to={to} aria-current={isCurrent(to) ? 'page' : undefined}>
                                {label}
                            </Link>
                        ))}
                    </nav>
                    <div className="auth">
                        {user ? (
                            <>
                                <Link className="hello" to="/cuenta">
                                    Hola, {firstName(user.nombre)}
                                    {isAdmin && <span className="role">Admin</span>}
                                </Link>
                                <button className="btn btn-outline btn-sm" onClick={logout}>Cerrar sesión</button>
                            </>
                        ) : (
                            <>
                                <Link className="navlink" to="/ingresar">Iniciar sesión</Link>
                                <Link className="btn btn-outline btn-sm" to="/registro">Crear cuenta</Link>
                            </>
                        )}
                    </div>
                </div>

                <Link className="cartbtn" to="/carrito" aria-label="Ver carrito de compras">
                    <IconBag size={22} />
                    <span className="badge" ref={badgeRef} hidden={count === 0}>{count > 99 ? '99+' : count}</span>
                </Link>

                <button
                    className="burger"
                    aria-label="Abrir menú"
                    aria-expanded={open}
                    aria-controls="hpanel"
                    onClick={() => setOpen((v) => !v)}
                >
                    <IconMenu />
                </button>
            </div>
        </header>
    );
}
