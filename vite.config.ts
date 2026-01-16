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
    },
    "/api/admin": {
      target: "https://lokaly.site",
      changeOrigin: true,
      secure: true,
      ws: false,
    },
  },
},
});