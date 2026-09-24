# LAB CRUD - Backend

Backend pedagógico con Express, Mysql, bcrypt, JWT y roles `admin` / `cliente`.

## 1. Base de datos

ejecuta `../sql/lab_crud.sql` en MySQL.

## 2. variables de entorno

Copia:

`.env.example` → `.env`

y completa las credenciales de MySQL y `JWT_secret`.

## 3. instalar

```bash
npm install
```

## 4. ejecutar

```bash
npm run dev
```

API: `http://localhost:3000`

## rutas

publicas:
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/health`

protegidas:
- GET `/api/equipos`
- GET `/api/equipos/:id`
- POST `/api/equipos`
- PUT `/api/equipos/:id`
- DELETE `/api/equipos/:id` - solo `admin`

## Flujo pedagógico

Registro → bycrypt.hash → MySQL → login → bycript.compare → JWT → middlewares → autorizacion por rol → CRUD.