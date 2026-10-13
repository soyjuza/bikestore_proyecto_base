import { Link } from 'react-router-dom';
import { CATEGORIAS } from '../data/seed';
import { USE_MOCK } from '../config/env';
import { resetDemo } from '../services/mock/db';

export default function Footer() {
    function reset() {
        resetDemo();
        // recarga para que todos los contextos lean los datos nuevos
        window.location.assign('/');
    }

    return (
        <footer className="foot">
            <div className="wrap">
                <div className="fgrid">
                    <div>
                        <Link className="logo logo-pie" to="/" aria-label="BikeStore, ir al inicio">
                            <img src="/img/marca/isotipo-claro.png" alt="" />
                            <span>BikeStore</span>
                        </Link>
                        <p>Tienda en línea de bicicletas deportivas y accesorios para ciclismo.</p>
                    </div>
                    <div>
                        <h4>Tienda</h4>
                        <ul>
                            <li><Link to="/catalogo">Todo el catálogo</Link></li>
                            {CATEGORIAS.map((c) => (
                                <li key={c.id}><Link to={`/catalogo?categoria=${c.id}`}>{c.nombre}</Link></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4>Tu cuenta</h4>
                        <ul>
                            <li><Link to="/ingresar">Iniciar sesión</Link></li>
                            <li><Link to="/registro">Crear cuenta</Link></li>
                            <li><Link to="/recuperar">Recuperar contraseña</Link></li>
                            <li><Link to="/cuenta">Mis pedidos</Link></li>
                            <li><Link to="/carrito">Carrito</Link></li>
                            <li><Link to="/creditos">Créditos de las fotos</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="copy">
                    <span>© 2026 BikeStore. Proyecto didáctico ADSO.</span>
                    <span>
                        Prototipo de diseño con pago simulado.
                        {USE_MOCK && <> <button onClick={reset}>Restablecer datos de demostración</button></>}
                    </span>
                </div>
            </div>
        </footer>
    );
}
