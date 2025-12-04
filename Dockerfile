FROM nginx:stable

WORKDIR /usr/share/nginx/html

# Copiamos el build de Vite
COPY dist/ ./

# Config de nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf