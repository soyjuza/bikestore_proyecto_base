# Pruebas de seguridad del backend

Fecha: 10/11/2026. Se hicieron sobre la rama `zapata` con Node 22 y MySQL 8.

Las pruebas están en `tests/seguridad.test.js` y `tests/limites.test.js`. Se corren con `npm test`
junto con las demás. Cada una hace una petición como la haría alguien que quiere saltarse una regla
y revisa que la API responda lo que debe y que en la base de datos no haya cambiado nada.

Resultado: 47 pruebas de seguridad, 47 pasan. En total con las funcionales son 133.

Actualizado el 10/11/2026 (noche): contraseña segura, correo de recuperación en HTML, aviso de cambio
de contraseña y límite de enlaces por correo. Esas pruebas están en `tests/cuenta.test.js` y `tests/usuarios.test.js`.

## Qué requisitos cubren

| Requisito | Qué pide | Dónde se prueba |
|-----------|----------|-----------------|
| RF-30 | Controlar el acceso según el rol | Control de acceso, Tokens |
| RNF-04 | Nadie sin permiso entra a lo del administrador | Control de acceso, Tokens |
| RNF-05 | Contraseñas sin texto plano | Contraseñas y datos sensibles |
| RNF-06 | Integridad de productos, usuarios, pedidos y detalles | Inyección, Reglas de la compra |
| RNF-10 | Mensajes de error que se entiendan | Datos mal formados (400 con mensaje, no 500) |

## Pruebas

### Control de acceso por rol

| Prueba | Resultado esperado | Pasa |
|--------|--------------------|------|
| Llamar las 16 rutas protegidas sin token | 401 en todas | Sí |
| Un cliente llama las 9 rutas del administrador | 403 en todas | Sí |
| Un cliente intenta ponerse rol admin o desactivar a otro | 403 y nada cambia en la tabla | Sí |
| Registrarse mandando `rol: "admin"` | La cuenta queda como cliente | Sí |
| Mandar `rol` o `id_usuario` en «Mis datos» | Se ignoran | Sí |
| Un cliente pide el pedido de otro por el número | 404 | Sí |
| Mandar el `id_usuario` de otro al guardar el carrito | Se guarda en el carrito propio | Sí |

### Tokens

| Prueba | Resultado esperado | Pasa |
|--------|--------------------|------|
| Token firmado con otra clave | 401 | Sí |
| Token de cliente con el contenido cambiado a admin | 401 | Sí |
| Token sin firma (`alg: none`) | 401 | Sí |
| Token vencido | 401 | Sí |
| Texto cualquiera o autenticación Basic | 401 | Sí |
| Revisar qué lleva el token por dentro | Solo id, rol y huella; ni correo ni contraseña | Sí |
| A un admin le quitan el rol y sigue usando su token | 403 | Sí |
| Desactivan una cuenta que tenía la sesión abierta | 401 | Sí |
| Cambiar la contraseña con otra sesión abierta en otro equipo | Las dos sesiones viejas dan 401 | Sí |
| Recuperar la contraseña por correo con una sesión abierta | La sesión vieja da 401 | Sí |

### Inyección y datos mal formados

| Prueba | Resultado esperado | Pasa |
|--------|--------------------|------|
| `' OR '1'='1`, `'; DROP TABLE usuarios; --` y otros en el login | 401, sin token | Sí |
| Lo mismo en el id del producto | 404 | Sí |
| Lo mismo en `categoria`, `q` y `orden` del catálogo | 200 con lista vacía | Sí |
| `orden=constructor`, `orden=__proto__`, parámetros repetidos | 200, se ignora el orden | Sí |
| Inyección en número de pedido, búsqueda de usuarios y fechas del informe | 404, lista vacía y 400 | Sí |
| Contar las filas después de todos los intentos | Siguen los 17 productos y los usuarios | Sí |
| Objetos, listas, números o `null` donde va un texto | 400 o 401, nunca 500 | Sí |
| JSON mal escrito / cuerpo de 200 kb | 400 / 413 | Sí |
| Petición sin cuerpo | 400, el servidor sigue arriba | Sí |
| Contraseña de 5000 caracteres | 400 | Sí |
| Nombre con `<script>` | Se guarda como texto, la respuesta es JSON con `nosniff` | Sí |

### Contraseñas y datos sensibles

| Prueba | Resultado esperado | Pasa |
|--------|--------------------|------|
| Mirar la columna `password` después de un registro | Hash de bcrypt (`$2b$...`) | Sí |
| Buscar el hash o la palabra `password` en las respuestas | No aparecen | Sí |
| Comparar el token del correo con lo guardado en `recuperaciones` | Son distintos (se guarda el hash) | Sí |
| Token de recuperación inventado o con inyección | 410 | Sí |
| Registrarse o cambiar la contraseña sin mayúscula, minúscula, número o carácter especial | 400 | Sí |
| Cambiar la contraseña por una igual a la actual | 400 | Sí |
| El enlace del correo lleva el token después de `#`, no de `?` | Nunca llega a los registros de un servidor | Sí |
| Nombre con HTML dentro del correo de recuperación | Se escribe escapado (`&lt;img…`), no se interpreta | Sí |
| Después de cambiar la contraseña | Llega un correo de aviso, sin enlace de recuperación | Sí |
| Forzar un error de la base de datos | 500 con «Error interno del servidor», sin detalle | Sí |
| Buscar el número de cuenta completo en `pedidos` | No está, solo los últimos 4 | Sí |

### Subida de imágenes

| Prueba | Resultado esperado | Pasa |
|--------|--------------------|------|
| Un cliente sube una imagen | 403 y no queda archivo | Sí |
| HTML, PHP o SVG con extensión y tipo de imagen | 400 y no queda archivo | Sí |
| Nombres como `../../../server.js` o `foto.php.png` | Se guarda con un nombre al azar `.png` dentro de `uploads/productos` | Sí |
| Imagen de más de 2 MB | 400 | Sí |
| Imagen buena con datos del producto malos | 400 y la imagen se borra | Sí |
| Pedir `/uploads/../package.json`, `/uploads/..%2f.env`, `.gitkeep` | 404 | Sí |

### Cabeceras y origen

| Prueba | Resultado esperado | Pasa |
|--------|--------------------|------|
| Revisar las cabeceras de una respuesta | Están `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`; no está `X-Powered-By` | Sí |
| Petición con `Origin` del frontend y con otro origen | Solo el frontend recibe `Access-Control-Allow-Origin` | Sí |

### Reglas de la compra

| Prueba | Resultado esperado | Pasa |
|--------|--------------------|------|
| Mandar `precio: 1` y `total: 1` en el carrito y en el pago | Se cobra el precio de la base de datos | Sí |
| Cantidad negativa / cantidad de 999999999 | 400 / baja a las existencias | Sí |
| Guardar directo en MySQL existencias negativas, precio 0 o un pedido pagado sin datos | MySQL lo rechaza (CHECK y llaves foráneas) | Sí |

Dos pruebas de `tests/compra.test.js` también son de integridad: cinco cambios del carrito al mismo
tiempo no crean dos carritos, y dos clientes que pagan a la vez la última unidad no la compran los dos.

### Límite de intentos (`tests/limites.test.js`)

| Prueba | Resultado esperado | Pasa |
|--------|--------------------|------|
| 8 inicios de sesión correctos seguidos | 200 en todos, no gastan intentos | Sí |
| 5 contraseñas equivocadas y un sexto intento | 429, también con la contraseña correcta | Sí |
| Pedir el enlace de recuperación más veces de las permitidas | 429 | Sí |
| Pedir un cuarto enlace para el mismo correo en 15 minutos (`tests/cuenta.test.js`) | 429 y no se envía | Sí |

En el servidor los límites son: 10 intentos fallidos de inicio de sesión cada 15 minutos,
20 registros o recuperaciones cada 15 minutos y 300 peticiones por minuto a toda la API, por IP.
Además, cada correo recibe como máximo 3 enlaces de recuperación cada 15 minutos (`LIMITE_CORREO`),
aunque se pidan desde computadores distintos.
En las pruebas se bajan para no tener que hacer tantas peticiones.

## Dependencias

`npm audit --omit=dev` no reporta vulnerabilidades. `exceljs` traía una versión vieja de `uuid`
con un aviso de nivel moderado; se forzó una versión corregida con `overrides` en `package.json`.

Queda un aviso moderado en `nodemon` (por `minimatch`). `nodemon` solo se usa al programar,
no se instala en el servidor (`npm install --omit=dev`), así que se dejó.

## Lo que se decidió dejar así

- **Recuperar contraseña dice si el correo tiene cuenta.** Lo más seguro sería responder siempre lo mismo,
  pero la HU22 pide el mensaje «No hay una cuenta registrada con ese correo». Para que no se pueda
  usar para sacar una lista de correos, la ruta tiene límite de intentos. Con el registro pasa igual
  («Este correo ya tiene una cuenta»).
- **El token se guarda en `localStorage` del navegador.** Así lo hace el frontend. Si alguien lograra
  meter un script en la página lo podría leer. React escapa el texto que muestra y la API no devuelve HTML,
  pero es algo para revisar si el proyecto crece.
- **Sin HTTPS.** El despliegue es en un servidor local (RNF-12). En internet tendría que ir detrás de HTTPS.
- **El conteo de intentos está en memoria.** Si el servidor se reinicia, el conteo vuelve a cero.
  Para un solo servidor local es suficiente.

## Cómo repetirlas

```bash
cd backend
cp .env.test.example .env.test    # y poner las credenciales de MySQL
npm install
npm test
```
