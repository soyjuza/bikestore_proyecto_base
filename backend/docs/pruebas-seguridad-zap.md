# Pruebas de seguridad con OWASP ZAP

Fecha: 12/11/2026. Se hicieron sobre la rama `zapata`, con ZAP 2.17 en modo automático
(headless) contra la API (`http://localhost:3000`) y el frontend (`http://localhost:5173`)
corriendo en local.

Para no arriesgar los datos de desarrollo, el escaneo se hizo contra una **copia desechable**
de la base (`bikestore_scan`, cargada desde `sql/bikestore.sql`). Así ZAP pudo atacar con todo
sin tocar nada real. La copia se borra al terminar.

## Qué se hizo

1. Se revisó que la app respondiera y que ZAP estuviera disponible.
2. Araña tradicional y araña AJAX (la tienda usa JavaScript) para descubrir las rutas.
3. Escaneo **activo** en la máxima potencia (fuerza Alta, umbral Bajo) sobre toda la API,
   autenticado como administrador para llegar también a las zonas privadas.
4. Pruebas manuales dirigidas para confirmar o descartar lo que la herramienta marcó, y para
   revisar cosas que una herramienta sola no ve (enumeración, control de acceso, el token JWT).

## Resultado en una frase

El backend está bien protegido: no se encontró ninguna falla grave real. Lo que ZAP marcó como
«Alta» resultaron ser **dos falsos positivos** (se explican abajo con la prueba). Lo accionable
son dos cosas medias y unas cuantas de despliegue.

## Resumen por gravedad

| Gravedad | Hallazgo | ¿Real? |
|----------|----------|--------|
| Alta | «Inyección SQL» en `POST /orders` y `PUT /users/me` | **Falso positivo** (probado) |
| Media | Enumeración de usuarios en registro y recuperación | Real — **corregida** |
| Media | El frontend se sirve sin cabeceras de seguridad | Real (al desplegar) |
| Baja | El token de sesión se guarda en `localStorage` | Real, con atenuante |
| Baja | Sin HTTPS en local y HSTS sin efecto | Real (al desplegar) |
| Baja | El informe en Excel guarda texto del usuario | Real, no explotable hoy |
| Informativa | Ruido (variación de User-Agent, comentarios, etc.) | Se ignora |

---

## Hallazgos reales (ordenados por gravedad)

### Media 1 — Enumeración de usuarios  _(corregida el 12/11/2026)_

**Qué es, en simple.** La app deja saber a un desconocido si un correo tiene cuenta o no. Eso se
llama enumeración de usuarios: sirve para armar una lista de correos válidos antes de intentar
adivinar contraseñas o mandar correos de phishing.

**Dónde aparece.**

- `POST /api/auth/register`: con un correo que ya existe responde `409` «Este correo ya tiene una
  cuenta»; con uno nuevo responde `201`. La diferencia dice si el correo existe.
- `POST /api/auth/recover`: con un correo registrado responde `200` «Le enviamos un enlace»; con
  uno que no existe responde `404` «No hay una cuenta registrada con ese correo». Incluso distingue
  si la cuenta está desactivada (`403`).

**Qué tan grave es.** Media. No entra a ninguna cuenta por sí sola, pero es el primer paso de un
ataque. Llama la atención porque el inicio de sesión **sí** está bien hecho contra esto (mismo
mensaje para correo o contraseña equivocados, y tarda lo mismo exista o no el correo). Recuperación
y registro se quedaron atrás.

**Cómo se arregla.** En recuperación, responder siempre lo mismo, exista o no el correo, y mandar el
enlace solo si la cuenta existe. En `auth.service.js`:

```js
// En requestPasswordReset: en vez de lanzar 404 o 403, responder igual siempre.
const [rows] = await pool.execute(
  "SELECT id_usuario, nombre, activo FROM usuarios WHERE email = ?", [email]);
const user = rows[0];

// Solo si la cuenta existe y está activa se manda el enlace; si no, no se hace nada.
if (user && user.activo) {
  // ... generar token y enviar el correo (el bloque que ya tienes) ...
}

// Misma respuesta para todos: no se revela si el correo existe.
return; // el controlador responde 200 "Si el correo existe, le enviamos un enlace."
```

En registro el arreglo es más incómodo (al usuario hay que decirle si el correo ya está tomado),
así que ahí se acepta la fuga como un mal menor. Lo importante es cerrar recuperación.

**Lo que se hizo.** En `auth.service.js`, `requestPasswordReset` ya no responde distinto según si el
correo existe o la cuenta está activa: si no hay a quién enviarle, corta en silencio. Y si el correo
no llega a salir, se anota en la consola pero tampoco se avisa. El controlador responde siempre el
mismo mensaje: «Si el correo está registrado, le enviamos un enlace para recuperar la contraseña.»
Queda un residuo menor: el límite anti-spam por correo sigue devolviendo `429` al 4.º intento sobre
una cuenta que existe, lo que revela su existencia tras varios intentos; se dejó así por ser una
función de abuso ya probada y de muy poco valor como oráculo. Las 133 pruebas siguen pasando.

### Media 2 — El frontend se sirve sin cabeceras de seguridad

**Qué es, en simple.** El backend manda cabeceras que protegen al navegador (`helmet`), pero las
páginas del frontend se entregan sin ellas. Sin esas cabeceras, otra página podría meter la tienda
dentro de un marco invisible y engañar al usuario para que haga clic donde no quiere (clickjacking),
o el navegador podría ejecutar contenido que no debería.

**Dónde aparece.** En todo lo que sirve el frontend (`http://localhost:5173`). ZAP marcó: falta
`Content-Security-Policy`, falta cabecera anti-clickjacking (`X-Frame-Options`) y falta
`X-Content-Type-Options`.

**Qué tan grave es.** Media, pero con matiz: esto salió del servidor de desarrollo de Vite, que a
propósito no pone cabeceras. Lo que importa es **cómo se sirva el frontend al desplegar**. El
backend ya está bien; el hosting del frontend debe quedar igual.

**Cómo se arregla.** Si el frontend se sirve detrás de un servidor propio, poner las mismas
cabeceras. Si queda detrás de nginx, por ejemplo:

```nginx
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
```

Si se sirve con Express (archivos estáticos), reutilizar `helmet`, igual que en el backend.

### Baja 1 — El token de sesión se guarda en `localStorage`

**Qué es, en simple.** Cuando el usuario entra, el token (su «pase» de sesión) se guarda en
`localStorage` del navegador (`src/utils/storage.js`). Si algún día hubiera un fallo de XSS
(inyección de JavaScript), ese script podría leer el token y robar la sesión.

**Qué tan grave es.** Baja. Hace falta primero un XSS para aprovecharlo, y eso hoy está bien
cubierto: React escapa el texto solo, no se usa `dangerouslySetInnerHTML` y el backend manda una
`Content-Security-Policy` estricta. Es un riesgo conocido del patrón, no una falla abierta.

**Cómo se arregla (si se quiere subir el listón).** Guardar el token en una cookie `HttpOnly`
(el JavaScript no la puede leer) en vez de `localStorage`. Es un cambio grande en cómo maneja la
sesión el frontend y el backend, así que para el proyecto se puede dejar documentado como riesgo
aceptado, con el atenuante de la CSP.

### Baja 2 — Sin HTTPS en local y HSTS sin efecto

**Qué es, en simple.** En local todo va por HTTP (sin cifrar). El backend manda la cabecera `HSTS`
(que obliga a usar HTTPS), pero por HTTP el navegador la ignora, así que ahora mismo no hace nada.

**Qué tan grave es.** Baja en local (es lo normal mientras se programa). Importa al desplegar: la
tienda tiene que quedar en `https://` con un certificado, porque ahí viajan contraseñas y el token.

**Cómo se arregla.** Publicar detrás de HTTPS (el hosting o un proxy como nginx con un certificado
de Let's Encrypt). Ahí la cabecera HSTS que ya mandas empieza a servir.

### Baja 3 — El informe en Excel guarda texto que escribe el usuario

**Qué es, en simple.** En el informe del administrador, el nombre del cliente y el del producto se
escriben tal cual en las celdas. Si alguien se registra con un nombre como `=1+1`, ese texto llega
al Excel del administrador. En algunos programas, un texto que empieza por `=` se interpreta como
fórmula (inyección de fórmulas / CSV injection).

**Qué tan grave es.** Baja y **hoy no explotable**. Se probó de punta a punta: un cliente con nombre
`=1+1` hizo un pedido y se exportó el Excel. La librería (`exceljs`) guarda el valor como **texto**,
no como fórmula, así que Excel y LibreOffice lo muestran literal y no lo ejecutan. Queda como buena
práctica, y porque **si algún día se exporta a CSV sí sería un hueco real**.

**Cómo se arregla.** Antes de escribir un texto del usuario en una celda, ponerle una comilla
delante si empieza por un carácter de fórmula. En `reports.service.js`:

```js
function celdaSegura(valor) {
  const s = String(valor ?? "");
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
// al armar las filas: cliente: celdaSegura(p.cliente), email: celdaSegura(p.email), etc.
```

---

## Falsos positivos (lo que ZAP marcó y NO es)

Importante dejarlos por escrito: un «Alta» no se descarta por intuición, se comprueba.

### «Inyección SQL» (Alta) en `POST /orders` y `PUT /users/me` — falso positivo

ZAP mandó payloads como `Calle 1' AND '1'='1` y marcó inyección SQL. **No lo es**, por dos razones
comprobadas:

- En `POST /orders`, el campo `direccion` **solo se guarda**; nunca filtra una consulta, así que no
  puede ser un vector de inyección booleana. Se insertó una dirección con el payload y al leer el
  pedido de vuelta aparece **literal** (`"Calle 1' AND '1'='1"`): entró como dato, no como código.
- En `PUT /users/me`, el `email` va en una consulta **parametrizada** (`WHERE email = ?`). Un correo
  con comilla y espacio lo rechaza antes la validación (`400`), y los payloads `'1'='1` y `'1'='2`
  dan la **misma respuesta**: no hay ninguna lógica SQL respondiendo distinto.

Toda la capa de datos usa `pool.execute(... ?)`, nunca pega texto del usuario en el SQL. Las sondas
manuales de inyección en login, búsqueda y rutas también fallaron todas.

### «XSS reflejada» (Baja) en `PUT /users/me` — falso positivo

ZAP vio que el `nombre` que manda se devuelve en la respuesta. Pero la respuesta es `application/json`,
no HTML: el navegador no ejecuta nada ahí. Y donde ese nombre se pinta (el frontend) React lo escapa
solo. No hay ejecución de código.

---

## Lo que se probó y está bien

Esto también es resultado del trabajo: se auditó a fondo y aguantó.

| Qué se probó | Resultado |
|--------------|-----------|
| Inyección SQL (login, búsqueda, rutas, cuerpos) | Todo parametrizado, nada pasa |
| Token falso con `alg:none` | Rechazado (`401`) |
| Token de cliente con el rol cambiado a `admin` | Rechazado (`401`): la firma no cuadra |
| Cliente llamando rutas de administrador | `403` en todas (incluido intentar desactivar al admin) |
| Rutas protegidas sin token | `401` |
| CORS con un origen falso | No lo acepta |
| Cabeceras del backend | CSP, HSTS, `nosniff`, `X-Frame-Options`, sin `X-Powered-By` |
| Contraseñas | Con bcrypt, nunca salen en una respuesta |
| Enlace de recuperación | Token guardado como hash, de un solo uso, caduca a los 30 min |
| Subida de imágenes | Revisa los bytes reales y el servidor pone el nombre del archivo |

El rol siempre se lee de la base de datos, no del token, y si a alguien le cambian la contraseña o
le desactivan la cuenta, su token deja de servir en el momento (la «huella» del token).

## Qué hacer primero

1. ~~Cerrar la enumeración en recuperación (Media 1).~~ **Hecho el 12/11/2026.**
2. **Al desplegar**, servir el frontend con las cabeceras de seguridad y todo por HTTPS (Media 2 y
   Baja 2).
3. **Opcional**, la comilla de protección en el Excel (Baja 3), por si algún día se exporta a CSV.
4. El token en `localStorage` (Baja 1) se puede dejar documentado como riesgo aceptado.
