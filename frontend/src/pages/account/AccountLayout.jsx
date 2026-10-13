import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLogout } from '../../hooks/useLogout';
import { Breadcrumbs } from '../../components/ui';
import { getMyOrders } from '../../services/orders.service';
import { dateCO, firstName } from '../../utils/format';

// Mi cuenta (cliente con sesión): pedidos, datos y contraseña. Las subpáginas reciben los pedidos por el Outlet.
export default function AccountLayout() {
    const { user } = useAuth();
    const logout = useLogout();
    const [orders, setOrders] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            setOrders(await getMyOrders());
        } catch (err) {
            setError(err.message);
            setOrders([]);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load, user.id_usuario]);

    const links = [['/cuenta', 'Mis pedidos', orders?.length], ['/cuenta/datos', 'Mis datos'], ['/cuenta/clave', 'Contraseña']];

    return (
        <div className="view">
            <section className="wrap pagehead">
                <Breadcrumbs items={[['/', 'Inicio'], ['/cuenta', 'Mi cuenta']]} />
                <h1 className="h1">Hola, {firstName(user.nombre)}</h1>
                <p className="lead">{user.email}{user.created_at ? `, cliente desde ${dateCO(user.created_at)}` : ''}.</p>
            </section>
            <section className="wrap acc">
                <nav className="accnav" aria-label="Mi cuenta">
                    {links.map(([to, label, n]) => (
                        <NavLink key={to} to={to} end={to === '/cuenta'}>
                            {label}{n != null && <small>{n}</small>}
                        </NavLink>
                    ))}
                    <button onClick={logout}>Cerrar sesión</button>
                </nav>
                <div className="accmain">
                    {error && <p className="meta">{error}</p>}
                    <Outlet context={{ orders, reloadOrders: load }} />
                </div>
            </section>
        </div>
    );
}
