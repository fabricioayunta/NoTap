# NotApp — Catálogo de Jiu-Jitsu con panel de administración (CMS)

Catálogo online (no es una tienda: no hay carrito ni pagos). El cliente elige producto, talle, color y
cantidad, y la consulta termina en **WhatsApp** con el mensaje armado. Un panel privado
(`/paneladmin`) permite administrar productos, categorías, fotos, **casilleros y stock**, logo y WhatsApp.

- **Base de datos:** PostgreSQL en **Supabase** (esquema en `sql/schema.sql`).
- **Fotos:** Supabase Storage (en local, carpeta `uploads/`).
- **Sitio y API:** **Vercel** (sitio estático en `public/` + función en `api/`).

👉 Para publicarlo: **GUIA_SUPABASE_VERCEL.md**.

## Estructura

```
api/[...path].js   Función de Vercel (todas las rutas /api/...)
lib/api.js         Rutas de la API (públicas y de administración)
lib/db.js          Acceso a las tablas (producto, stock, casillero, categoria...)
lib/pg.js          Conexión a PostgreSQL y creación inicial de tablas y datos
lib/schema.js      Esquema SQL (copia en sql/schema.sql)
lib/stock.js       Reglas de stock (combinaciones talle x color, vista pública)
lib/storage.js     Fotos: Supabase Storage o carpeta local
lib/auth.js        Contraseñas (scrypt) y sesiones firmadas en cookie
public/            Sitio público
public/paneladmin/ Panel de administración
server.js          Servidor local (npm start)
vercel.json        Configuración de Vercel
```

## Tablas

`administrador`, `configuracion`, `categoria`, `casillero`, `producto`, `imagen`, `talle`, `color`,
`producto_talle`, `producto_color`, `stock`.

## Control de stock y casilleros

Cada producto tiene un **casillero** (por ejemplo `A4`, `C2`) y una cantidad **por talle y color**.

- **Stock**: vista agrupada por casillero; se cambia la cantidad y se guarda sola.
- **Dashboard**: aviso de reposición, contador "Con stock bajo" y lista "Para reponer".
- **Configuración → Stock**: número general de "stock bajo" (por defecto 3). Avisa con esa cantidad **o menos**.
- **Editar producto**: casillero, "stock bajo de este producto" (opcional, reemplaza al general) y cantidades.

En el sitio público los talles/colores agotados se marcan y, si todo el producto está en 0, aparece como
"Sin stock". El casillero y las cantidades **no se publican**: solo los ve el panel.

## Seguridad

- Contraseñas con `scrypt` (nunca en texto plano).
- Sesión en cookie `HttpOnly` firmada (HMAC), válida 8 horas.
- Todas las rutas `/api/admin/*` exigen sesión.
- Credenciales iniciales: `admin@jiustore.com` / `JiuStore2026!` → **cambiarlas al ingresar**
  (o definir `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes del primer uso).

## Variables de entorno

Ver `.env.example`. Obligatoria: `DATABASE_URL`. Para fotos: `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`.
Opcionales: `SESSION_SECRET`, `SUPABASE_BUCKET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
