// Fonte única de verdade pras rotas do painel admin (route group
// app/(painel)/) — usada pelo robots.ts pra montar o disallow. Adicionar
// uma página nova ao grupo (painel) e esquecer de listar aqui faz ela ficar
// indexável só por robots.txt (o noindex do layout do grupo ainda protege),
// mas listar aqui mantém o disallow completo também.
export const ROTAS_PAINEL_ADMIN = ["/seo", "/worker", "/usuarios"] as const;
