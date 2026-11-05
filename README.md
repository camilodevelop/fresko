# FRESKO Landing Page

Landing page premium para **FRESKO** — bowls y ensaladas saludables en Bogotá.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Framer Motion
- Shadcn-style UI (Button, Input, Badge)

## Inicio rápido

Requiere Docker Desktop abierto (Supabase corre localmente).

```bash
npm install
npx supabase start        # base de datos, auth y panel en Docker
cp .env.example .env.local # pega la PUBLISHABLE_KEY que imprime el comando anterior
npm run dev
```

- Sitio: [http://localhost:3000](http://localhost:3000)
- Panel: [http://localhost:3000/admin](http://localhost:3000/admin)
- Supabase Studio (ver tablas): [http://127.0.0.1:54323](http://127.0.0.1:54323)
- Correos de prueba (Mailpit): [http://127.0.0.1:54324](http://127.0.0.1:54324)

Usuarios de prueba (contraseña `fresko123`): `admin@fresko.test`, `cocina@fresko.test`,
`domicilios@fresko.test`, `cliente@fresko.test`.

`npx supabase db reset` reinicia la base con las migraciones de `supabase/migrations` y `supabase/seed.sql`.
Tras cambiar el esquema: `npx supabase gen types typescript > src/lib/supabase/database.types.ts`.

## Estructura

```
src/
├── app/
│   ├── layout.tsx      # Fonts, SEO metadata
│   ├── page.tsx        # Landing composition
│   └── globals.css     # Brand tokens
├── components/
│   ├── layout/         # Navbar, Footer
│   ├── sections/       # Hero, Builder, etc.
│   ├── bowl-builder/   # BowlPreview layers
│   └── ui/             # Reusable UI primitives
└── lib/
    ├── constants.ts
    ├── utils.ts
    └── data/           # Mock products, builder, coverage
public/images/          # Brand assets
```

## Secciones

1. Navbar sticky con blur
2. Hero split + animaciones
3. Validador de cobertura (mock)
4. Categorías BASIC / PREMIUM / FULL
5. **Arma tu bowl** (`/arma-tu-bowl`) — builder interactivo con capas
6. Menú teaser → `/menu`
7. Cómo funciona
8. Suscripciones
9. Testimonios
10. Footer

## Branding

| Token | Color |
|-------|-------|
| Primary | `#1F4D36` |
| Fresh | `#8BC34A` |
| Light | `#C5E1A5` |
| Cream | `#F8F7F2` |
| Dark | `#1B1B1B` |

## Personalización

- WhatsApp: editar `WHATSAPP_URL` en `src/lib/constants.ts`
- Productos: `src/lib/data/products.ts`
- Builder: `src/lib/data/builder.ts`
- Cobertura: `src/lib/data/coverage.ts`

## Build

```bash
npm run build
npm start
```

## Deploy en Vercel

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. **Add New Project** → Importa `camilodevelop/fresko`.
3. Vercel detecta Next.js automáticamente. No cambies el **Root Directory**.
4. Clic en **Deploy**.

Cada push a `main` generará un deploy automático.

**Variables de entorno:** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de un proyecto Supabase en la nube (aplica las migraciones con `npx supabase link` + `npx supabase db push`).

**Dominio:** en Project Settings → Domains puedes agregar `fresko.co` o el que uses.
