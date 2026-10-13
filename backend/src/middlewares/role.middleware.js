// Autorización por rol (RF-30, RNF-04). Se usa después de authenticate:
//   router.delete('/:id', authenticate, authorize('admin'), controller.remove)
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.rol)) {
            return res.status(403).json({
                ok: false,
                message: 'No tienes permisos para realizar esta operación'
            });
        }
        next();
    };
}

module.exports = { authorize };
