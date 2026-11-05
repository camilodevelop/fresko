import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  // Vercel no lo necesita. Para Docker / servidor propio: NEXT_OUTPUT=standalone npm run build
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: {
    // Habilita forbidden() / unauthorized() para el panel con permisos.
    authInterrupts: true,
  },
};

export default nextConfig;
