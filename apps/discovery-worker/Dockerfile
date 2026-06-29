FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates libnss3 nss-plugin-pem \
    && rm -rf /var/lib/apt/lists/*

# curl-impersonate: build do curl que reproduz a "impressão digital" de TLS
# de um navegador Chrome real. O curl padrão (vinculado ao OpenSSL) tem uma
# assinatura de handshake TLS diferente da de um navegador, e a Cloudflare
# (proteção anti-bot da OLX) bloqueia justamente por essa assinatura — mesmo
# passando pelo proxy residencial/ISP correto e com headers idênticos.
RUN curl -fsSL https://github.com/lwthiker/curl-impersonate/releases/download/v0.6.1/curl-impersonate-v0.6.1.x86_64-linux-gnu.tar.gz \
      | tar xz -C /usr/local/bin

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Mercado Livre exige um browser real (Playwright) navegando organicamente
# pra passar pelo bloqueio de bot deles (ver project_repasse_livre_mercadolivre_*
# na memória do projeto — curl/curl-impersonate não resolve, é bloqueio
# comportamental, não de TLS fingerprint). xvfb-run dá um display virtual
# pro Chromium rodar em modo "headed" de verdade dentro do container Linux,
# sem precisar de monitor físico.
RUN npx playwright install --with-deps chromium
RUN apt-get update && apt-get install -y --no-install-recommends xvfb xauth \
    && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["npm", "run", "discover"]
