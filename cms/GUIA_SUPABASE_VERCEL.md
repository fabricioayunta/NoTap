# Cómo publicar NotApp gratis (Supabase + Vercel)

Tiempo estimado: 20–30 minutos. Necesitás tres cuentas gratuitas: **GitHub**, **Supabase** y **Vercel**.

Qué hace cada una:
- **Supabase**: guarda la base de datos (PostgreSQL) y las fotos.
- **GitHub**: guarda el código.
- **Vercel**: muestra el sitio en internet.

---

## Paso 1 — Crear el proyecto en Supabase

1. Entrá a https://supabase.com, creá una cuenta y tocá **New project**.
2. Nombre: `notapp`. En **Database Password** inventá una contraseña y **guardala** (la vas a necesitar). Conviene que use solo letras y números.
3. Región: **South America (São Paulo)**. Tocá **Create new project** y esperá un par de minutos.

## Paso 2 — Copiar los datos de conexión

Los necesitás en el paso 4. Anotalos en un bloc de notas.

1. Arriba, tocá el botón **Connect**. Elegí **Transaction pooler** y copiá la dirección (empieza con `postgresql://`). Reemplazá `[YOUR-PASSWORD]` por la contraseña del paso 1. → Esto es tu `DATABASE_URL`.
   - Tiene que ser la del **Transaction pooler** (puerto 6543). La "Direct connection" no funciona desde Vercel.
2. Entrá a **Project Settings → API** (o "API Keys"):
   - **Project URL** (algo como `https://abcd1234.supabase.co`) → es tu `SUPABASE_URL`.
   - La llave secreta **service_role** (o "secret key") → es tu `SUPABASE_SERVICE_KEY`. **No la compartas ni la subas a GitHub.**

No hace falta crear tablas ni el espacio para las fotos: el sitio los crea solo la primera vez que se usa.

## Paso 3 — Subir el código a GitHub

1. Descomprimí el archivo `notapp-catalogo-cms.zip`.
2. En https://github.com tocá **New repository**, ponele de nombre `notapp` y creálo (puede ser privado).
3. Tocá **uploading an existing file** y arrastrá **el contenido** de la carpeta (las carpetas `api`, `lib`, `public`, `sql`, y los archivos `package.json`, `vercel.json`, etc.). Tocá **Commit changes**.
   - No subas el archivo `.env` si lo creaste ni la carpeta `node_modules`.

## Paso 4 — Publicar en Vercel

1. Entrá a https://vercel.com e ingresá con tu cuenta de GitHub.
2. Tocá **Add New → Project** y elegí el repositorio `notapp` (**Import**).
3. En **Framework Preset** dejá **Other**. No cambies nada de Build ni Output.
4. Abrí **Environment Variables** y agregá estas (nombre y valor):

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | la dirección del Transaction pooler (paso 2) |
   | `SUPABASE_URL` | el Project URL |
   | `SUPABASE_SERVICE_KEY` | la llave service_role |
   | `SESSION_SECRET` | cualquier frase larga que inventes (recomendado) |

5. Tocá **Deploy**. Cuando termine, Vercel te da la dirección del sitio (por ejemplo `notapp.vercel.app`).

## Paso 5 — Probar

1. Abrí `tu-sitio.vercel.app/api/productos`: tiene que mostrar los productos de ejemplo (la primera vez tarda unos segundos porque crea las tablas).
2. Abrí `tu-sitio.vercel.app` y navegá el catálogo.
3. Abrí `tu-sitio.vercel.app/paneladmin` e ingresá con:
   - Email: `admin@jiustore.com`
   - Contraseña: `JiuStore2026!`
4. **Cambiá la contraseña** en Configuración → Seguridad.
5. Podés ver los datos en Supabase → **Table Editor** (tablas `producto`, `stock`, `casillero`…).

Cada vez que subas un cambio a GitHub, Vercel vuelve a publicar solo.

---

## Cosas para saber

- **Pausa por inactividad:** si nadie usa el proyecto de Supabase durante 7 días, se pausa. Entrá a supabase.com y tocá **Restore project**. Conviene entrar antes de mostrar el trabajo.
- **Límites gratis de Supabase:** 500 MB de base de datos y 1 GB de fotos. Para un catálogo alcanza de sobra.
- **Fotos:** el panel reduce solo las fotos pesadas (máximo 3 MB cada una).
- **Copias de seguridad:** el plan gratis no las hace solo. En Supabase → Table Editor podés exportar cada tabla (CSV) de vez en cuando.
- **Usar otro correo o contraseña inicial:** antes del primer uso, agregá en Vercel `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

## Si algo falla

| Qué pasa | Qué hacer |
|---|---|
| Dice "Falta la variable DATABASE_URL" | Falta cargarla en Vercel → Settings → Environment Variables. Después hacé **Redeploy**. |
| "password authentication failed" | La contraseña dentro de `DATABASE_URL` está mal. Si tiene símbolos como `@` o `#`, cambiala en Supabase por una de letras y números. |
| "No se pudo completar la operación" | Revisá que `DATABASE_URL` sea la del **Transaction pooler** (puerto 6543) y que el proyecto de Supabase no esté pausado. |
| Las fotos no se suben | Revisá `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` (la llave secreta, no la "anon"). |
| `/api/productos` da error 404 | Verificá que la carpeta `api` esté en la raíz del repositorio, junto a `package.json`. |

## Usarlo en tu computadora (opcional)

1. Instalá Node.js (versión 18 o más).
2. Copiá `.env.example` como `.env` y completá los datos del paso 2.
3. En una terminal dentro de la carpeta: `npm install` y después `npm start`.
4. Abrí http://localhost:3000 y http://localhost:3000/paneladmin
