# Captação do Mercado Livre — rodando LOCAL (no seu PC)

> **Resumo:** a captação do Mercado Livre **não roda mais na Railway**. Ela roda
> **no seu PC**, pelo seu IP residencial (que o ML aceita), a cada **6 horas**,
> disparada pelo **Agendador de Tarefas do Windows**. Custo: **zero** (sem proxy).
>
> Motivo: o ML só aceita IP residencial de verdade; qualquer proxy/ISP é
> bloqueado (account-verification). Rodando do seu PC: sem proxy, sem custo, e
> resolve o FIPE de todos os modelos (a Railway dava 403 na FIPE oficial).

---

## Não é um "serviço" do Windows

É uma **Tarefa Agendada** (Agendador de Tarefas / Task Scheduler), chamada
**`RepasseLivre-ML`**. Não aparece no `services.msc` — aparece no Agendador.

---

## O mapa — onde está cada coisa

| O quê | Onde |
|---|---|
| 📄 **Arquivo de instruções** (o que rodar) | `C:\claude\run-ml.cmd` |
| 📋 **Log** (o que aconteceu em cada run) | `C:\claude\ml-cron.log` |
| 🌐 **Navegador** (Chrome do robô) | `C:\claude\pw-browsers\` |
| ⚙️ **Código da captação** | `C:\claude\repasse-livre\apps\discovery-worker\` |
| ⏰ **Agendamento** (a cada 6h) | Agendador de Tarefas → tarefa `RepasseLivre-ML` |

---

## Como funciona (em 1 frase)

**A cada 6h, o Agendador dispara o `run-ml.cmd` → ele abre a captação do ML pelo
seu IP → grava as oportunidades no banco → escreve no log → fecha.**

Cada disparo é um programa que **abre, trabalha e fecha sozinho**. Não é servidor,
não tem nada ligado o tempo todo (não precisa se preocupar com "o Node caiu").

### O que tem dentro do `run-ml.cmd`

```bat
cd /d "C:\claude\repasse-livre\apps\discovery-worker"   REM entra na pasta do código
set PATH=%PATH%;C:\Program Files\nodejs                 REM acha o Node
set PLAYWRIGHT_BROWSERS_PATH=C:\claude\pw-browsers      REM acha o navegador
npm run discover:mercadolivre                           REM RODA a captação
REM (tudo isso é escrito no log C:\claude\ml-cron.log)
```

> ⚠️ O `PLAYWRIGHT_BROWSERS_PATH` fixo é importante: sem ele, o Agendador não acha
> o navegador (ambiguidade de perfil/AppData). Não remova essa linha.

---

## Como VER e MEXER

1. Menu Iniciar → digite **"Agendador de Tarefas"** → abra.
2. Clique em **"Biblioteca do Agendador de Tarefas"** (à esquerda).
3. Ache **`RepasseLivre-ML`**. Ali dá pra:
   - **Executar** (botão direito → Executar) — roda na hora, pra testar.
   - Ver **Disparadores** (está a cada 6h) e o **Histórico** de execuções.
   - **Desabilitar** (pausa sem apagar) ou **Excluir**.
   - **Propriedades → Disparadores → Editar** — mudar a frequência.

### Ver se rodou / deu certo
Abra o log `C:\claude\ml-cron.log` (bloco de notas). Cada run tem início, o que
captou e `fim (exit 0)` = sucesso. Procure por linhas `✓ ... (N fotos)`.

---

## Requisitos e cuidados

- **Sobrevive a reinício/desligar**: a tarefa é persistente (fica salva no
  Windows). Após um reboot, ela continua disparando nos horários normais (00h,
  06h, 12h, 18h) — não precisa reconfigurar nada.
- **Disparo perdido (PC estava desligado)**: está ligada a opção *"executar assim
  que possível após um disparo perdido"* (`StartWhenAvailable`), então ao religar
  o PC ele roda o que perdeu. Se ficar dias off, o giro do ML repõe os anúncios.
- **Ritmo:** está em 6h (4x/dia). Dá pra aumentar, mas convém não martelar (é um
  IP único; o ML pode fichar se for muito agressivo). Se aumentar, olhe o log pra
  ver se aparece `account-verification`.

---

## Reconstruir do ZERO (trocou de PC / formatou / o PC morreu)

Tudo que é versionado está no GitHub; só o que é específico da máquina precisa ser
refeito. Passo a passo num PC novo (Windows):

1. **Node.js** — instale em `C:\Program Files\nodejs` (ou ajuste o caminho no
   `run-ml.cmd`).
2. **Código** — clone o repo em `C:\claude\repasse-livre` (ou ajuste os caminhos).
3. **Dependências**:
   ```
   cd C:\claude\repasse-livre\apps\discovery-worker
   npm ci
   ```
4. **`.env`** — crie `apps/discovery-worker/.env` com as credenciais do Supabase
   (o `.env` NÃO vai pro git). Pegue os valores no painel do **Supabase** ou nas
   variáveis do serviço na **Railway**:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
   > **Importante:** NÃO defina `PROXY_URL` aqui — é justamente a ausência dele que
   > faz sair pelo seu IP residencial (o que o ML aceita).
5. **Navegador do Playwright** (em caminho fixo):
   ```
   set PLAYWRIGHT_BROWSERS_PATH=C:\claude\pw-browsers
   npx playwright install chromium
   ```
6. **Script** — copie `repasse-livre/scripts/run-ml.cmd` (a cópia versionada) para
   `C:\claude\run-ml.cmd`, conferindo os caminhos.
7. **Tarefa agendada** (PowerShell):
   ```powershell
   schtasks /create /tn "RepasseLivre-ML" /tr "C:\claude\run-ml.cmd" /sc HOURLY /mo 6 /st 00:00 /f
   ```
8. **Teste**: `schtasks /run /tn "RepasseLivre-ML"` e confira `C:\claude\ml-cron.log`
   (deve ter `✓ ... (N fotos)` e `fim (exit 0)`).

> A cópia versionada do script está em **`scripts/run-ml.cmd`** (backup no GitHub).
> A que roda de verdade é a `C:\claude\run-ml.cmd`.

---

## Railway (o resto continua lá)

Só o **Mercado Livre** saiu da Railway. **OLX**, **Webmotors** e o **cron mensal
de FIPE** continuam rodando na Railway normalmente. O cron do ML na Railway
(`repasse-livre-mercadolivre`) está com **"No schedule"** (não roda), então não
gasta proxio nem roda em dobro. O serviço continua existindo (parado) — é só isso
que permite voltar pro modo cloud num clique.

---

## Como VOLTAR pro modo cloud (Railway + Thordata + stealth)

O **mesmo código** roda local ou na nuvem — a diferença é só o `PROXY_URL` e ONDE
dispara. No modo cloud, o browser e o FIPE saem pelo **proxy residencial da
Thordata** e o **stealth** (já no código, `playwright-extra`) contorna o
account-verification. Foi validado que funciona; saímos dele só por **custo**
($2/GB) e porque o local é mais confiável (residencial não dá 403 na FIPE).

Pra reverter:
1. **Railway** → serviço `repasse-livre-mercadolivre` → **Settings → Cron
   Schedule** → colocar de volta `0 */16 * * *` (ou a frequência desejada).
2. Conferir que o **`PROXY_URL`** (Thordata residencial) está setado nas variáveis
   do serviço — é ele que ativa proxy+stealth (sem ele, tentaria sair pelo IP da
   Railway e tomaria account-verification/403).
3. **Desabilitar a tarefa local** `RepasseLivre-ML` (Agendador → botão direito →
   Desabilitar) pra não rodar em dobro.
4. Ajustar `MERCADOLIVRE_MAX_PAGINAS` no `worker_config` conforme o orçamento de
   GB (no cloud, cada página/detalhe consome proxy).

**Trade-offs do cloud** (por que saímos): custo por GB; a FIPE oficial dá 403 no
IP de datacenter (a base local cobre parte, o resto sai pelo proxy e às vezes dá
`fetch failed`); e o proxy tem instabilidade de SSL. O **local resolve tudo isso**
— só exige o PC ligado. Ver `project_repasse_livre_fipe_oficial_403_railway` na
memória pro histórico completo dos testes (SB, ISP, residencial).
