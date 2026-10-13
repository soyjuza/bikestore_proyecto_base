import { Link, NavLink, Outlet } from 'react-router-dom';
import { IconBox, IconDashboard, IconShop, IconUsers } from '../../components/Icons';

const LINKS = [
    ['/admin', 'Tablero', IconDashboard],
    ['/admin/productos', 'Productos', IconBox],
    ['/admin/usuarios', 'Usuarios', IconUsers]
];

// Panel del administrador (RF-17 a RF-31). La ruta está protegida con ProtectedRoute roles={['admin']}.
export default function AdminLayout() {
    return (
        <div className="view">
            <div className="admin">
                <nav className="aside" aria-label="Panel de administración">
                    <p className="atit">Administración</p>
                    {LINKS.map(([to, label, Icon]) => (
                        <NavLink key={to} to={to} end>
                            <Icon /><span>{label}</span>
                        </NavLink>
                    ))}
                    <Link className="bottom" to="/"><IconShop /><span>Ver la tienda</span></Link>
                </nav>
                <section className="amain">
                    <Outlet />
                </section>
            </div>
        </div>
    );
}
