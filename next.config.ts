import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  // Vercel no lo necesita. Para Docker / servidor propio: NEXT_OUTPUT=standalone npm run build
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  images: {
    // Fotos de productos en Supabase Storage (nube y local)
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    // Habilita forbidden() / unauthorized() para el panel con permisos.
    authInterrupts: true,
  },
};

export default nextConfig;
