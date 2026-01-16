import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  plugins: [react(), mkcert()],
server: {
  proxy: {
    "/api/public": {
      target: "https://lokaly.site",
      changeOrigin: true,
      secure: true,
      ws: false,
      timeout: 120000,        // <- tiempo total
      proxyTimeout: 120000,   // <- tiempo esperando respuesta del upstream      
    },
    "/api/admin": {
      target: "https://lokaly.site",
      changeOrigin: true,
      secure: true,
      ws: false,
      timeout: 120000,        // <- tiempo total
      proxyTimeout: 120000,   // <- tiempo esperando respuesta del upstream      
    },
  },
},
});