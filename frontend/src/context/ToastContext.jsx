import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const ToastContext = createContext(null);

// Aviso flotante con una acción opcional («Ver carrito», «Deshacer»...).
export function ToastProvider({ children }) {
    const [toast, setToast] = useState({ text: '', action: null, visible: false });
    const timer = useRef(null);
    const callback = useRef(null);

    const show = useCallback((text, action, onAction) => {
        callback.current = action ? onAction : null;
        setToast({ text, action: action || null, visible: true });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000);
    }, []);

    useEffect(() => () => clearTimeout(timer.current), []);

    function runAction() {
        setToast((t) => ({ ...t, visible: false }));
        if (callback.current) callback.current();
    }

    const value = useMemo(() => ({ show }), [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className={`toast${toast.visible ? ' show' : ''}`} role="status" aria-live="polite">
                <span>{toast.text}</span>
                {toast.action && <button onClick={runAction}>{toast.action}</button>}
            </div>
        </ToastContext.Provider>
    );
}
