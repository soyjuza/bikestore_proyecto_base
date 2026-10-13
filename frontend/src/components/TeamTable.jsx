import { Package, Pencil, Trash2 } from 'lucide-react';
import { urlImagen } from '../utils/format';

export default function TeamTable({ equipos, canDelete, onEdit, onDelete }) {
  if (!equipos.length) {
    return (
      <div className="card empty-state">
        <Package size={28} />
        <p>Aún no hay equipos registrados.</p>
      </div>
    );
  }

  return (
    <div className="equipos-section">
      <h2>Equipos</h2>

      <div className="equipos-grid">
        {equipos.map((equipo) => {
          const imagen = urlImagen(equipo.imagen);

          return (
            <div className="equipo-card" key={equipo.id_equipo}>
              <div className="equipo-card-image">
                {imagen ? <img src={imagen} alt={equipo.nombre} /> : <Package size={32} />}
              </div>

              <div className="equipo-card-body">
                <h3>{equipo.nombre}</h3>
                <p className="equipo-card-meta">
                  {equipo.marca || 'Sin marca'} · {equipo.modelo || 'Sin modelo'}
                </p>
              </div>

              <div className="actions equipo-card-actions">
                <button className="edit" onClick={() => onEdit(equipo)}>
                  <Pencil size={16} />
                  Editar
                </button>
                {canDelete && (
                  <button className="secondary" onClick={() => onDelete(equipo.id_equipo)}>
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
