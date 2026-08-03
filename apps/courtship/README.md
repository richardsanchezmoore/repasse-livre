# The Courtship Almanac — embrião US (inglês)

Teste do produto **Damas Virtuosas** no mercado americano, em inglês. **Incubado**: usa o
**MESMO Supabase do Repasse Livre**, com prefixo de tabelas **`ca_`** (espelhando o `corte_*`).
Deploy futuro = **projeto Vercel próprio** (subdomínio amigável US → futuro `.com`).

## Decisões travadas (03/08)
- **Gateway:** Lemon Squeezy (Merchant of Record — sem LLC, cuida do imposto US, USD, webhook). Payout via Wise.
- **Marca:** The Courtship Almanac · **subdomínio:** courtshipalmanac
- **Preço:** US$ 9 (pagamento único, acesso vitalício)
- **Prefixo de tabelas:** `ca_` (ca_membros, ca_acessos, ca_config, ca_claims)

## O que já existe
- `public/almanac/index.html` — **landing em inglês** (adaptada ao universo cristão protestante US;
  versos Prov 31:30 e 4:23; "Your Boaz" = gíria cristã US). Reaproveita as 12 cenas Regency (sem texto).
- `public/almanac/imagens/` — cena1–12 (ilustrações reaproveitadas do BR).

## TODO (placeholders no HTML marcados com TODO(US))
- **Checkout:** links `data-checkout` apontam pra `courtshipalmanac.lemonsqueezy.com/buy/REPLACE-ME` →
  trocar pela URL real do produto no Lemon Squeezy. Claim de auto-login vai via `?checkout[custom][claim]=`.
- **Pixel Meta US:** criar novo dataset/pixel (NÃO reusar o BR) e colar no `<head>`.
- **Depoimentos:** inserir REAIS quando houver (não fabricar). Slider PT não serve.
- **Mockups do app:** gerar em INGLÊS (os PT não servem).
- **Capa/cover do Almanac:** gerar arte com título em inglês.

## ✅ Scaffold do backend — FEITO (04/08)
- **Next app** espelhando o corte: `package.json`, `next.config.mjs` (rewrite `/almanac`), `jsconfig.json`, `middleware.js`.
- **Supabase clients** (`lib/supabaseAdmin/Server/Browser.js`), `lib/auth.js`, `lib/acessos.js` (tabelas `ca_`).
- **Webhook Lemon Squeezy** `app/api/ls/route.js`: verifica assinatura HMAC (`X-Signature`), concede acesso em
  `ca_acessos`, dispara **e-mail de acesso** (Resend, `await` — não fire-and-forget) e grava o **claim**. Claim
  vem em `meta.custom_data.claim` (setado no checkout via `?checkout[custom][claim]=`).
- **Auto-login**: `app/api/claim/route.js` + `app/welcome/` (page + actions + `WelcomeAccess.js`) + `app/auth/callback`.
- **/login** mínimo, **home** placeholder (`app/page.js`), **globals.css** (Regency).
- **E-mail de acesso EN** (`lib/emailAcesso.js`, layout escuro, remetente por env).
- **Migration** `supabase/migrations/0061_ca_funil.sql` (ca_membros, ca_config, ca_acessos, ca_claims + RLS).

## Env vars (projeto Vercel do courtship)
```
NEXT_PUBLIC_SUPABASE_URL        (mesmo do Repasse Livre)
NEXT_PUBLIC_SUPABASE_ANON_KEY   (mesmo)
SUPABASE_SERVICE_ROLE_KEY       (mesmo)
LEMON_WEBHOOK_SECRET            (segredo do webhook no Lemon Squeezy)
RESEND_API_KEY                  (conta Resend do brand US)
CA_EMAIL_FROM                   (default: The Courtship Almanac <hello@courtshipalmanac.com>)
CA_APP_URL                      (default: https://courtshipalmanac.com — trocar pelo subdomínio Vercel no início)
```

## Pra LIGAR o funil (o que falta, precisa de você)
1. **Lemon Squeezy**: criar loja + produto ($9). Pegar (a) a **URL de checkout** e (b) o **segredo do webhook**.
   - Webhook LS → apontar pra `https://<subdominio>/api/ls`, eventos `order_created` + `order_refunded`.
   - Redirect pós-compra do produto → `https://<subdominio>/welcome`.
   - Trocar `REPLACE-ME` na landing (`public/almanac/index.html`) e em `ca_config.plans.kit.checkout_url` pela URL real.
2. **Rodar a migration** `0061_ca_funil.sql` no Supabase (npm run migrar).
3. **Vercel**: novo projeto, Root Directory = `apps/courtship`, colar as envs, subdomínio.
4. **Resend**: verificar o domínio/remetente do brand US (ou usar o subdomínio inicial).
5. **Pixel Meta US** no `<head>` do layout e da landing (novo dataset — TODO(US)).

## Assets que o usuário refaz
Vídeos (áudio/legenda EN), imagens/criativos (captions EN), mockups EN, cover EN.
