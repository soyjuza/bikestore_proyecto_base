import { useEffect } from 'react';

const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Revela con una transición los elementos con [data-reveal] cuando entran en pantalla.
   Un MutationObserver detecta los que React agrega después (filtros, páginas nuevas)
   y vuelve a poner la clase «in» si React reescribe el className de uno ya revelado. */
export function useReveal(rootRef) {
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;

        const show = (el) => {
            el.classList.add('in');
            el.dataset.shown = '1';
        };

        const io = 'IntersectionObserver' in window && !reduce
            ? new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        show(e.target);
                        io.unobserve(e.target);
                    }
                });
            }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 })
            : null;

        const scan = () => {
            root.querySelectorAll('[data-reveal]').forEach((el) => {
                if (el.classList.contains('in')) return;
                if (el.dataset.shown || !io) show(el);
                else io.observe(el);
            });
        };

        scan();
        const mo = new MutationObserver(scan);
        mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

        return () => {
            mo.disconnect();
            io?.disconnect();
        };
    }, [rootRef]);
}
