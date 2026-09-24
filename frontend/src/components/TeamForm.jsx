import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Plus, Save, X } from 'lucide-react';
import { urlImagen } from '../utils/format';

const empty = { nombre: '', marca: '', modelo: '' };

export default function TeamForm({ editing, onSubmit, onCancel }) {
  const [form, setForm] = useState(empty);
  const [imagenFile, setImagenFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setForm(editing || empty);
    setImagenFile(null);
    setPreview(editing ? urlImagen(editing.imagen) : null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [editing]);

  function change(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  function changeImagen(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImagenFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({ ...form, imagenFile });
    setForm(empty);
    setImagenFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <form onSubmit={submit} className="card form-grid">
      <h2>{editing ? 'Editar equipo' : 'Nuevo equipo'}</h2>

      <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={change} required />
      <input name="marca" placeholder="Marca" value={form.marca} onChange={change} />
      <input name="modelo" placeholder="Modelo" value={form.modelo} onChange={change} />

      <label className="image-upload-field">
        <span><ImagePlus size={16} /> Imagen del equipo</span>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeImagen} />
      </label>

      {preview && (
        <div className="image-preview">
          <img src={preview} alt="Vista previa" />
        </div>
      )}

      <div className="actions">
        <button type="submit" className={editing ? 'edit' : ''}>
          {editing ? <Save size={16} /> : <Plus size={16} />}
          {editing ? 'Actualizar' : 'Crear'}
        </button>
        {editing && (
          <button type="button" className="secondary" onClick={onCancel}>
            <X size={16} />
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
