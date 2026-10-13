import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { EmptyState } from '../../components/ui';
import { getUsers, setUserActive, updateUserRole } from '../../services/users.service';
import { dateCO, initials } from '../../utils/format';

// RF-27..31: consultar cuentas, asignar roles y activar o desactivar el acceso
export default function UsersAdminPage() {
    const { user: me } = useAuth();
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({ q: '', rol: 'todos' });

    const load = useCallback(async () => {
        try {
            setUsers(await getUsers());
        } catch (err) {
            toast.show(err.message);
        }
    }, [toast]);

    useEffect(() => {
        load();
    }, [load]);

    async function changeRole(u, rol) {
        try {
            await updateUserRole(u.id_usuario, rol);
            await load();
            toast.show(`Rol actualizado: ${u.nombre} ahora es ${rol === 'admin' ? 'administrador' : 'cliente'}`);
        } catch (err) {
            toast.show(err.message);
        }
    }

    async function toggle(u) {
        try {
            await setUserActive(u.id_usuario, !u.activo);
            await load();
            toast.show(!u.activo ? `La cuenta de ${u.nombre} quedó activa` : `La cuenta de ${u.nombre} quedó desactivada: ya no puede iniciar sesión`);
        } catch (err) {
            toast.show(err.message);
        }
    }

    const q = filters.q.trim().toLowerCase();
    const list = users.filter((u) => (!q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        && (filters.rol === 'todos' || u.rol === filters.rol));

    const setF = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

    return (
        <>
            <div className="ahead">
                <div>
                    <h1>Usuarios</h1>
                    <p>Consulta las cuentas, asigna roles y activa o desactiva el acceso.</p>
                </div>
            </div>

            <form className="box filters" role="search" onSubmit={(e) => e.preventDefault()}>
                <div className="field" style={{ flex: '2 1 260px' }}>
                    <label htmlFor="au-q">Buscar por nombre o correo</label>
                    <input className="inp" id="au-q" name="q" type="search" value={filters.q} onChange={setF} placeholder="Ej.: laura, @correo.co" />
                </div>
                <div className="field">
                    <label htmlFor="au-rol">Rol</label>
                    <select className="sel" id="au-rol" name="rol" value={filters.rol} onChange={setF}>
                        <option value="todos">Todos</option>
                        <option value="cliente">Cliente</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
            </form>

            <p className="tcount" aria-live="polite">{list.length} de {users.length} usuarios</p>

            {list.length ? (
                <div className="box">
                    <table className="tbl">
                        <thead><tr><th>Usuario</th><th>Registro</th><th>Rol</th><th>Estado</th><th className="num">Acciones</th></tr></thead>
                        <tbody>
                            {list.map((u) => {
                                const isMe = me?.id_usuario === u.id_usuario;
                                return (
                                    <tr key={u.id_usuario}>
                                        <td className="first" data-l="Usuario">
                                            <div className="who">
                                                <span className="avatar">{initials(u.nombre)}</span>
                                                <div><b>{u.nombre}{isMe && ' (tú)'}</b><small>{u.email}</small></div>
                                            </div>
                                        </td>
                                        <td data-l="Registro">{dateCO(u.created_at)}</td>
                                        <td data-l="Rol">
                                            <label className="vh" htmlFor={`rol-${u.id_usuario}`}>Rol de {u.nombre}</label>
                                            <select
                                                className="sel"
                                                id={`rol-${u.id_usuario}`}
                                                value={u.rol}
                                                disabled={isMe}
                                                title={isMe ? 'No puedes cambiar tu propio rol' : undefined}
                                                onChange={(e) => changeRole(u, e.target.value)}
                                            >
                                                <option value="cliente">Cliente</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                        </td>
                                        <td data-l="Estado">{u.activo ? <span className="st on">Activa</span> : <span className="st off">Desactivada</span>}</td>
                                        <td data-l="Acciones">
                                            <div className="acts">
                                                <button
                                                    className={`btn btn-sm ${u.activo ? 'btn-outline' : 'btn-dark'}`}
                                                    disabled={isMe}
                                                    title={isMe ? 'No puedes desactivar tu propia cuenta' : undefined}
                                                    onClick={() => toggle(u)}
                                                >
                                                    {u.activo ? 'Desactivar' : 'Activar'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState title="Sin resultados">No hay usuarios que coincidan con la búsqueda.</EmptyState>
            )}
        </>
    );
}
