import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    // Habilita forbidden() / unauthorized() para el panel con permisos.
    authInterrupts: true,
  },
};

export default nextConfig;
