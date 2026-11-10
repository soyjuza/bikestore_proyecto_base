# BikeStore

Tienda en línea de bicicletas y accesorios. Proyecto didáctico ADSO.

- `frontend/`: React + Vite, con el diseño del prototipo en HTML, CSS y JavaScript puro.
- `backend/`: Express + MySQL + JWT, con la arquitectura del proyecto base (rutas → controladores → servicios → base de datos).
- `sql/bikestore.sql`: esquema y datos iniciales.

## Arrancar solo el frontend (modo demo)

El frontend trae un **backend simulado** (`frontend/src/services/mock/db.js`) que guarda todo en `localStorage`
y aplica las mismas reglas que debe cumplir la API. Así la tienda se puede usar completa mientras se programa el backend.

```bash
cd frontend
cp .env.example .env      # VITE_USE_MOCK=true
npm install
npm run dev               # http://localhost:5173
```

Cuentas de demostración (también aparecen como botones en la página de inicio de sesión):

| Rol           | Correo                 | Contraseña |
|---------------|------------------------|------------|
| Cliente       | cliente@bikestore.co   | cliente123 |
| Administrador | admin@bikestore.co     | admin1234  |

Para ver un pago rechazado usa un número de cuenta que termine en `0000`.
El enlace «Restablecer datos de demostración» del pie de página vuelve a los datos iniciales.

## Arrancar con el backend real

1. Ejecuta `sql/bikestore.sql` en MySQL.
2. En `backend/`: copia `.env.example` → `.env`, completa las credenciales y ejecuta `npm install` y `npm run dev`.
   Al arrancar se crea el administrador con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
3. En `frontend/.env` pon `VITE_USE_MOCK=false` y reinicia `npm run dev`.

Cada servicio del frontend (`frontend/src/services/*.service.js`) decide si usa el mock o llama a la API,
así que se puede pasar a la API real módulo por módulo.

Con el backend real las cuentas de demostración de arriba no existen: se entra con el administrador del `.env`
y los clientes se crean desde «Crear cuenta». El enlace para recuperar la contraseña sale en la consola
del backend si no se configuró un correo (`SMTP_HOST`).

## Estado del backend

| Módulo     | Rutas | Controlador | Servicio |
|------------|-------|-------------|----------|
| auth       | ✔     | ✔           | ✔ registro, inicio de sesión y recuperar contraseña |
| products   | ✔     | ✔           | ✔ catálogo con filtro y orden, productos del administrador |
| cart       | ✔     | ✔           | ✔ |
| orders     | ✔     | ✔           | ✔ pago simulado en una transacción |
| users      | ✔     | ✔           | ✔ |
| reports    | ✔     | ✔           | ✔ tablero, Excel y PDF |

El backend tiene pruebas automáticas (`cd backend && npm test`). Cómo prepararlas está en `backend/README.md`
y las de seguridad están explicadas en `backend/docs/pruebas-seguridad.md`.

## Rutas de la API

Públicas:
- `GET  /api/health`
- `POST /api/auth/register` · `POST /api/auth/login`
- `POST /api/auth/recover` · `GET /api/auth/reset/:token` · `POST /api/auth/reset`
- `GET  /api/products` · `GET /api/products/:id`
- `GET  /api/products?categoria=montana&orden=asc` (filtro por categoría y orden por precio, `asc` o `desc`)

Con sesión:
- `GET  /api/cart` · `PUT /api/cart`
- `POST /api/orders` · `GET /api/orders/mine` · `GET /api/orders/mine/:numero`
- `PUT  /api/users/me` · `PUT /api/users/me/password`

Solo `admin`:
- `GET /api/products?todos=1` · `POST /api/products` · `PUT /api/products/:id` · `PATCH /api/products/:id/estado`
- `GET /api/products?todos=1&q=casco` busca por nombre · `GET /api/users?q=laura` busca por nombre o correo
- `GET /api/users` · `PATCH /api/users/:id/rol` · `PATCH /api/users/:id/estado`
- `GET /api/reports/dashboard` · `GET /api/reports/export/excel` · `GET /api/reports/export/pdf`

## Rutas del frontend

| Ruta                     | Página                          | Requisitos   |
|--------------------------|---------------------------------|--------------|
| `/`                      | Inicio                          |              |
| `/catalogo?categoria=&orden=` | Catálogo con filtros       | RF-01..04    |
| `/producto/:id`          | Detalle                         | RF-05        |
| `/carrito`               | Carrito                         | RF-06..08    |
| `/pago`                  | Resumen, pago y confirmación    | RF-09..12 (sesión) |
| `/ingresar` · `/registro` · `/recuperar` | Acceso          | RF-13..16    |
| `/cuenta/...`            | Mis pedidos, datos y contraseña | sesión       |
| `/admin` · `/admin/productos` · `/admin/usuarios` | Panel  | RF-17..31 (admin) |
| `/creditos`              | Créditos de las fotos           |              |

## Flujo de autenticación

Login → `AuthContext` guarda token y usuario en `localStorage` → `services/api.js` agrega `Authorization: Bearer` →
`auth.middleware.js` verifica el JWT y que la cuenta siga activa → `role.middleware.js` verifica el rol.

Ocultar un botón o una ruta en React no es seguridad: el backend vuelve a verificar el rol en cada petición.
