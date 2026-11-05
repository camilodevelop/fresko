# Despliegue de FRESKO

La app es Next.js estándar + Supabase. **No usa APIs propias de Vercel**: la base de datos,
el login, los archivos y el tiempo real viven en Supabase, así que cambiar de proveedor de
hosting solo implica cambiar dónde corre Next.js.

## Variables de entorno (en cualquier proveedor)

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (clave *publishable*) |

Son públicas por diseño (van al navegador); la seguridad la dan las políticas RLS de la base.
Se incrustan **al compilar**: si las cambias, vuelve a desplegar.

Sin estas variables el sitio sigue funcionando (landing y menú), pero el ingreso queda deshabilitado.

## En Supabase (una vez por dominio)

Authentication → URL Configuration:

- **Site URL**: `https://tu-dominio`
- **Redirect URLs**: `https://tu-dominio/auth/callback` (y el de cada entorno de pruebas)

Para Google: Authentication → Providers → Google, con el Client ID/Secret de Google Cloud
(en Google Cloud, la URL autorizada es `https://<ref>.supabase.co/auth/v1/callback`).

## Opción A · Vercel (actual)

Conecta el repo; detecta Next.js solo. Agrega las dos variables en Settings → Environment Variables.
`vercel.json` es opcional y otros proveedores lo ignoran.

## Opción B · Docker (Cloud Run, Fly.io, Railway, Render, VPS…)

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
  -t fresko .
docker run -p 3000:3000 fresko
```

Usa la salida `standalone` de Next.js (se activa con `NEXT_OUTPUT=standalone`, ya incluido en el Dockerfile).

## Opción C · Node en cualquier servidor

```bash
npm ci
NEXT_OUTPUT=standalone npm run build
node .next/standalone/server.js   # copia antes public/ y .next/static/ junto a server.js
```

O simplemente `npm run build && npm start` si el servidor conserva `node_modules`.

## Opción D · Cloudflare (Workers)

Next.js corre en Cloudflare con el adaptador oficial de OpenNext:

```bash
npm i -D @opennextjs/cloudflare wrangler
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

Configura las mismas dos variables en el dashboard de Cloudflare (Settings → Variables) y
como variables de build. Revisa la documentación de `@opennextjs/cloudflare` para la versión
de Next.js que estés usando antes de migrar.

## Base de datos

Las migraciones están en `supabase/migrations/` y no dependen del hosting:

```bash
npx supabase db push --db-url "postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres"
```

(`seed.sql` solo es para desarrollo local; no se aplica en la nube.)
