# Probar la API con Thunder Client

Peticiones de ejemplo en el orden en que conviene probarlas. La URL base es `http://localhost:3000/api`.

En las rutas que piden sesión hay que poner el token que devuelve el login en la pestaña
**Auth → Bearer**. El token dura 2 horas.

## Catálogo (no pide sesión)

| Petición | Qué hace |
|----------|----------|
| `GET /products` | Productos activos |
| `GET /products?categoria=montana` | Solo una categoría: `montana`, `ruta`, `urbana`, `ninos`, `accesorios` |
| `GET /products?orden=asc` | Del más barato al más caro (`desc` para lo contrario) |
| `GET /products?categoria=ruta&orden=desc` | Filtro y orden juntos |
| `GET /products/4` | Detalle de un producto |

## Cuenta

Registro, `POST /auth/register`:

```json
{ "nombre": "Laura Gómez", "email": "laura@correo.com", "password": "clave12345" }
```

Inicio de sesión, `POST /auth/login`:

```json
{ "email": "laura@correo.com", "password": "clave12345" }
```

Responde `user` y `token`. Para entrar como administrador se usan el correo y la contraseña
que están en el `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

Recuperar contraseña:

1. `POST /auth/recover` con `{ "email": "laura@correo.com" }`.
   Si no hay SMTP configurado, el correo sale en la consola del servidor. Ahí está el enlace con el token.
2. `GET /auth/reset/EL_TOKEN` responde 200 si el enlace todavía sirve y 410 si ya venció o ya se usó.
3. `POST /auth/reset` con `{ "token": "EL_TOKEN", "password": "claveNueva2" }`.

## Carrito (con token de cliente)

`PUT /cart` reemplaza el carrito completo:

```json
{ "items": [ { "id_producto": 10, "cantidad": 2 }, { "id_producto": 2, "cantidad": 1 } ] }
```

`GET /cart` devuelve lo guardado. Si se pide más de lo que hay en existencias, la cantidad baja sola al máximo disponible.

## Pedido (con token de cliente)

`POST /orders` paga lo que hay en el carrito:

```json
{
  "direccion": "Calle 30 # 28-14",
  "ciudad": "Palmira",
  "telefono": "3104567890",
  "numeroCuenta": "4111 1111 1111 1234"
}
```

Para ver un pago rechazado se usa una cuenta que termine en `0000` (responde 402).

- `GET /orders/mine` historial del cliente.
- `GET /orders/mine/BS-2026-00001` un pedido.

## Mi cuenta (con token)

- `PUT /users/me` con `{ "nombre": "...", "email": "..." }`.
- `PUT /users/me/password` con `{ "actual": "...", "nueva": "..." }`. Devuelve un token nuevo; el anterior ya no sirve.

## Administrador (con token de admin)

Productos. Crear y editar van como **Form** (multipart), no como JSON, porque llevan la imagen:

| Campo | Valor |
|-------|-------|
| nombre | Guantes de ruta |
| descripcion | Guantes cortos con gel en la palma. |
| categoria | accesorios |
| precio | 58000 |
| stock | 20 |
| imagen | archivo jpg, png o webp de máximo 2 MB |

- `POST /products` registra el producto.
- `PUT /products/18` lo edita (la imagen es opcional).
- `PATCH /products/18/estado` con `{ "activo": false }` lo inactiva.
- `GET /products?todos=1` lista también los inactivos. Acepta `q` y `categoria`.

Usuarios:

- `GET /users` y `GET /users?q=laura`.
- `PATCH /users/2/rol` con `{ "rol": "admin" }` o `{ "rol": "cliente" }`.
- `PATCH /users/2/estado` con `{ "activo": false }`.

Informes:

- `GET /reports/dashboard?desde=2026-08-01&hasta=2026-11-30&categoria=todas`
- `GET /reports/export/excel?desde=2026-08-01&hasta=2026-11-30`
- `GET /reports/export/pdf?desde=2026-08-01&hasta=2026-11-30`

Para guardar el Excel o el PDF en Thunder Client: después de enviar, botón de descargar de la respuesta.

## Códigos de respuesta

| Código | Cuándo sale |
|--------|-------------|
| 200 / 201 | Todo bien |
| 400 | Faltan datos o están mal |
| 401 | No hay token, venció o las credenciales no coinciden |
| 402 | La pasarela simulada rechazó el pago |
| 403 | El rol no tiene permiso o la cuenta está desactivada |
| 404 | No existe (producto, pedido, usuario, correo sin cuenta) |
| 409 | Choque: correo repetido o no alcanzan las existencias |
| 410 | El enlace de recuperación ya no sirve |
| 413 | La petición pesa demasiado |
| 429 | Demasiados intentos, hay que esperar |
