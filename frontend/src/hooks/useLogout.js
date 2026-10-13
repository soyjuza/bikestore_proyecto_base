import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

// Cierra la sesión y saca al usuario de las páginas que la necesitan.
export function useLogout() {
    const { logout } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return function () {
        logout();
        toast.show('Sesión cerrada. Tu carrito quedó guardado en tu cuenta.');
        if (/^\/(admin|cuenta|pago)/.test(pathname)) navigate('/');
    };
}
