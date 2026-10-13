import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

function Denied() {
    const toast = useToast();
    useEffect(() => {
        toast.show('No tiene permisos para acceder al panel de administración.');
    }, [toast]);
    return <Navigate to="/" replace />;
}

/* Control de acceso por rol (RF-30). Ocultar un enlace en React no es seguridad:
   el backend vuelve a verificar el token y el rol en cada petición (role.middleware.js). */
export default function ProtectedRoute({ roles, message = 'Inicie sesión para continuar.' }) {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/ingresar" replace state={{ from: location.pathname, flash: message }} />;
    }

    if (roles && !roles.includes(user.rol)) return <Denied />;

    return <Outlet />;
}
