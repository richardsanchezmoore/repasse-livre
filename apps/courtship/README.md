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

## Próximos passos (build do app)
1. Scaffold Next (espelhar apps/corte): app/, lib/, middleware, next.config (rewrite `/almanac`), package.json.
2. Migration `ca_*` no Supabase compartilhado.
3. Webhook `/api/ls` (Lemon Squeezy): assina evento `order_created`, concede acesso em `ca_acessos`,
   dispara e-mail de acesso (Resend, remetente do domínio US) + claim → `/welcome`.
4. `/welcome` (equivalente ao /bem-vinda) em inglês.
5. E-mail de acesso EN (reusar layout escuro do corte/lib/emailAcesso.js).
6. Vercel: novo projeto apontando pra apps/courtship + subdomínio.

## Assets que o usuário refaz
Vídeos (áudio/legenda EN), imagens/criativos (captions EN), mockups EN, cover EN.
