// Contraseña segura (HU05 y HU22). Son las mismas reglas que valida el backend en utils/validar.js.
export const PASSWORD_RULES = [
    { id: 'largo', label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
    { id: 'mayus', label: 'Una letra mayúscula', test: (v) => /[A-ZÑ]/.test(v) },
    { id: 'minus', label: 'Una letra minúscula', test: (v) => /[a-zñ]/.test(v) },
    { id: 'numero', label: 'Un número', test: (v) => /\d/.test(v) },
    { id: 'especial', label: 'Un carácter especial (por ejemplo * # ! ?)', test: (v) => /[^A-Za-zÑñ0-9\s]/.test(v) },
];

export const WEAK_PASSWORD =
    'La contraseña debe tener al menos 8 caracteres, con una mayúscula, una minúscula, un número y un carácter especial.';

export function isStrongPassword(value) {
    return typeof value === 'string' && PASSWORD_RULES.every((r) => r.test(value));
}
