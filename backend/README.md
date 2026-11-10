# BikeStore - Backend

API de la tienda hecha con Express y MySQL. Las contraseñas van con bcrypt, la sesión con JWT y hay dos roles: `admin` y `cliente`.

## 1. Base de datos

Ejecuta `../sql/bikestore.sql` en MySQL. Crea la base `bikestore` con las tablas y los 17 productos iniciales.

## 2. Variables de entorno

Copia `.env.example` como `.env` y completa:

- Las credenciales de MySQL (`DB_USER`, `DB_PASSWORD`).
- `JWT_SECRET`: una clave larga, de 32 caracteres o más. Se puede generar con
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD`: con esos datos se crea el administrador la primera vez que arranca el servidor.
- `SMTP_...`: solo si se quiere que el enlace de recuperar contraseña llegue a un correo de verdad.
  Si se deja vacío, el correo sale impreso en la consola del servidor y de ahí se copia el enlace.

## 3. Instalar y ejecutar

```bash
npm install
npm run dev
```

API: `http://localhost:3000`. Para saber si está arriba: `GET /api/health`.

## 4. Pruebas

Las pruebas necesitan una base de datos aparte porque la borran y la vuelven a crear cada vez.

1. Copia `.env.test.example` como `.env.test` y pon las credenciales de MySQL.
   El nombre de la base tiene que terminar en `_test`; si no, las pruebas no arrancan.
2. Ejecuta:

```bash
npm test
```

Son 129 pruebas. La base `bikestore_test` se crea sola a partir de `../sql/bikestore.sql`.

| Archivo | Qué prueba |
|---------|------------|
| `tests/cuenta.test.js` | Registro, inicio de sesión y recuperar contraseña (HU05, HU06, HU22) |
| `tests/catalogo.test.js` | Catálogo, filtro, orden y detalle (HU01 a HU04) y productos del administrador |
| `tests/compra.test.js` | Carrito guardado en la cuenta y pedido con pago simulado |
| `tests/usuarios.test.js` | Mis datos, cambio de contraseña y usuarios del administrador |
| `tests/informes.test.js` | Tablero, Excel y PDF |
| `tests/seguridad.test.js` | Ataques a la API (ver `docs/pruebas-seguridad.md`) |
| `tests/limites.test.js` | Bloqueo por muchos intentos seguidos |

## Cómo está organizado

```
server.js            arranca el servidor y crea el administrador inicial
src/app.js           middlewares generales y rutas
src/config/          variables de entorno y conexión a MySQL
src/routes/          qué ruta llama a qué controlador y qué permisos pide
src/controllers/     reciben la petición y responden
src/services/        reglas del negocio y consultas SQL
src/middlewares/     sesión, rol, subida de imágenes, límites y errores
src/utils/           token, validaciones, correo
tests/               pruebas
```

Una petición pasa por ruta → middlewares (sesión y rol) → controlador → servicio → base de datos.

## Rutas

Están en el README de la raíz del proyecto. En `docs/thunder-client.md` hay ejemplos para probarlas a mano.

## Seguridad

Lo que tiene la API y cómo se probó está en `docs/pruebas-seguridad.md`. En resumen:

- Contraseñas con bcrypt (RNF-05). Nunca salen en una respuesta.
- El rol se revisa en el servidor en cada petición (RF-30, RNF-04). Si a alguien le quitan el rol
  o le desactivan la cuenta, el token que tenía deja de servir en ese momento.
- Todas las consultas usan parámetros (`?`), no se arma SQL pegando texto del usuario.
- Límite de intentos en inicio de sesión, registro y recuperación.
- Las imágenes se revisan por contenido y el nombre del archivo lo pone el servidor.
- Compra y carrito en transacciones, con el precio tomado de la base de datos (RNF-06).
