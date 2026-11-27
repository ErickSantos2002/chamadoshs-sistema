# Etapa de build
# Versão exata e digest: a mesma imagem em todo build, até alguém trocar os
# dois de propósito. A tag sozinha (24-alpine) muda sem aviso.
FROM node:24.22.3-alpine3.24@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS builder

# Diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos de configuração e dependências
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Instala dependências exatamente como estão no package-lock.json. O npm ci
# não reescreve o lockfile e falha se ele divergir do package.json.
RUN npm ci

# Copia o restante do projeto (src/, index.html, public/, etc)
COPY . .

# Corrige permissões para Alpine (opcional, mas bom)
RUN find node_modules/.bin -type f -exec chmod +x {} \;

# Recebe a variável de ambiente do build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build do projeto Vite (gera /dist)
RUN npm run build

# Etapa final: Nginx para servir os arquivos (linha estável, versão e digest fixos).
# Variante slim: só o nginx, sem os módulos opcionais (xslt, njs, image-filter,
# geoip, acme) que este projeto não carrega. Menos bibliotecas na imagem, menos
# superfície de ataque. A tag sozinha muda sem aviso; o digest não.
FROM nginx:1.30.8-alpine-slim@sha256:e9eaa7298465eab06d618c51556fdcf3fb5061f9ff40bd28ee898fbd7ee7f900

# Copia o build final da etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Substitui o arquivo de configuração do Nginx (SPA fallback para React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Porta que o nginx realmente escuta (ver nginx.conf: listen 80).
# Estava declarada como 40, divergindo do servidor — funcionava porque EXPOSE
# é apenas declarativo, mas quebraria se o orquestrador usasse esse valor.
EXPOSE 80

# Comando de inicialização do Nginx
CMD ["nginx", "-g", "daemon off;"]
