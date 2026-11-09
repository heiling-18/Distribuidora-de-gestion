import type { NextConfig } from "next";

/** URL del backend (Distribuidora-de-gestion-backend). Solo la usa el servidor de Next, no el navegador. */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // El navegador llama a /api/... en el mismo dominio del frontend y Next lo reenvía al backend.
  // Así la cookie de sesión es del propio sitio y no hace falta CORS.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
