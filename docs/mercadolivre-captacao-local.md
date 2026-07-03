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

- **O PC precisa estar ligado** na hora do disparo (00h, 06h, 12h, 18h). Se
  estiver desligado, aquele run é pulado — o próximo horário pega. O giro do ML
  repõe os anúncios perdidos.
- **Ritmo:** está em 6h (4x/dia). Dá pra aumentar, mas convém não martelar (é um
  IP único; o ML pode fichar se for muito agressivo). Se aumentar, olhe o log pra
  ver se aparece `account-verification`.

---

## Recriar a tarefa (se um dia sumir)

No PowerShell:
```powershell
schtasks /create /tn "RepasseLivre-ML" /tr "C:\claude\run-ml.cmd" /sc HOURLY /mo 6 /st 00:00 /f
```

---

## Railway (o resto continua lá)

Só o **Mercado Livre** saiu da Railway. **OLX**, **Webmotors** e o **cron mensal
de FIPE** continuam rodando na Railway normalmente. O cron do ML na Railway
(`repasse-livre-mercadolivre`) foi/deve ser **desligado no painel** (Settings →
Cron Schedule) pra não rodar em dobro nem gastar proxy à toa.
