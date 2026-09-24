# LAB CRUD - FRONTEND
 react + vite para consumi el backend del laboratorio

 ## Requisitos

-Node.js 20+
-backend ejecutandose en `http://localhost:3000`
-base de datos `lab_crud`

## Instalar

```bash
npm intall
```

## Ejecutar

``` bash
npm run dev
```

Frontend: `http://localhost:5173`

## Usuarios de prueba

Admin (lo crea el seed al arrancar el backend, con los valores de `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `backend/.env`):
- `admin@labcrud.local`
- `Admin123*`

Si ya existe un usuario con ese correo, el seed no lo vuelve a crear ni cambia su contraseña.

Cliente: no se crea automáticamente. Regístralo desde la página de registro (`/registro`); los usuarios nuevos quedan con rol `cliente`.

## Responsabilidad

- `assets`: estilos y recursos.
- `components`: componentes reutilizables.
- `config`: configuracion del frontend.
- `context`: estado global de autentificacion.
- `hooks`: hooks propios.
- `pages`: pantallas.
- `services`: comunicacon con la api.
- `utils`: almacenamiento de sesion.

## Flujo

Login -> Authcontent -> en localStorage -> `api.js` agrega bearer token -> backend verifica JWT -> autorizacion por rol.

El boton Eliminar solo aparece para `admin`, pero el backend verifica el rol. oculta el boton en react no consituye seguridad