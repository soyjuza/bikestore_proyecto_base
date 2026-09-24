import { useEffect, useState } from "react";
import Navbar from '../components/Navbar';
import TeamForm from '../components/TeamForm';
import TeamTable from "../components/TeamTable";
import { useAuth } from "../hooks/useAuth";
import {
    createEquipo,
    deleteEquipo,
    getEquipos,
    updateEquipo
} from '../services/equipos.service';

export default function EquiposPage() {
    const { user } = useAuth();
    const [equipos, setEquipos] = useState([]);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');


    async function load() {
        try {
            const result = await getEquipos();
            setEquipos(result.data);
        } catch (err) {
            setError(err.message);
        }
    }
    
    useEffect(() => {
        load();
    }, []);
    
    async function save(data) {
        try {
            setError('');
        
            if (editing) {
                await updateEquipo(editing.id_equipo, data);
                setEditing(null);
            } else {
                await createEquipo(data);
            }
        
            await load();
        } catch (err) {
            setError(err.message);
        }
    }
    
    async function remove(id) {
        if (!confirm('¿Eliminar este equipo?')) return;
    
        try {
            await deleteEquipo(id);
            await load();
        } catch(err) {
            setError(err.message);
        }
    }
    
    return (
        <>
            <Navbar />
            <main className="container">
                <header className="page-header">
                    <h1>CRUD de equipos</h1>
                    <p>sesión: {user?.email} · Rol: <strong>{user?.rol}</strong></p>
                </header>
    
                {error && <p className="error">{error}</p>}
    
                <TeamForm 
                    editing={editing}
                    onSubmit={save}
                    onCancel={() => setEditing(null)}
                />
    
                <TeamTable 
                    equipos={equipos}
                    canDelete={user?.rol === 'admin'}
                    onEdit={setEditing}
                    onDelete={remove}
                />
            </main>
        </>
    );
}