-- 0069: "transplante" do quiz do mockup (Dossiê) pro painel — respostas CURTAS em chip,
-- dinâmica que faz avançar rápido. ATIVO (pronto p/ A/B via ?q=raio-x-rapido); raiz fica a critério.
insert into public.corte_quizzes (slug, titulo, ativo, dados)
values (
  'raio-x-rapido',
  'O Raio-X Rápido do Pretendente',
  true,
  $json$
  {
    "lead": "6 perguntas rápidas. Responda com sinceridade e veja o Veredito sobre o rapaz que ocupa as suas orações.",
    "max": 18,
    "questoes": [
      {"t":"Quando você discorda, como ele reage?","opcoes":[
        {"p":3,"t":"Ouve"},{"p":1,"t":"Se cala"},{"p":0,"t":"Se irrita"}]},
      {"t":"Ele cumpre o que promete?","opcoes":[
        {"p":3,"t":"Sempre"},{"p":1,"t":"Às vezes"},{"p":0,"t":"Nunca"}]},
      {"t":"A vida financeira e de trabalho dele?","opcoes":[
        {"p":3,"t":"Honrado"},{"p":1,"t":"Instável"},{"p":0,"t":"Escorado"}]},
      {"t":"Como ele trata a mãe dele?","opcoes":[
        {"p":3,"t":"Com honra"},{"p":1,"t":"Distante"},{"p":0,"t":"Desprezo"}]},
      {"t":"A fé dele é de intimidade ou de vitrine?","opcoes":[
        {"p":3,"t":"De raiz"},{"p":1,"t":"De culto"},{"p":0,"t":"Vitrine"}]},
      {"t":"Ele te apresenta à vida dele?","opcoes":[
        {"p":3,"t":"Com orgulho"},{"p":1,"t":"A alguns"},{"p":0,"t":"Me esconde"}]}
    ],
    "faixas": [
      {"min":15,"cls":"green","titulo":"O Boaz da sua Temporada","texto":"Que alegria, minha querida! Os frutos deste rapaz revelam caráter, domínio próprio e fé de raiz. Ele te aproxima de Deus e não te esconde do mundo. Prossiga com sabedoria, oração e alegria — este é solo bom para plantar um lar."},
      {"min":8,"cls":"amber","titulo":"Um Pretendente a Observar","texto":"Há coisas boas nele, mas também sombras que pedem tempo. Palavras bonitas ainda não são atitudes firmes. Não entregue a chave do seu jardim fechado por pressa: observe os frutos por mais uma temporada, de olhos abertos e coração guardado."},
      {"min":0,"cls":"red","titulo":"Guarda o teu Coração","texto":"O raio-x acusou feridas sérias: controle, orgulho ou vida dupla. Por mais doce que seja o encantamento, esse caminho rouba a sua paz. Recue, busque conselho de quem te ama de verdade e lembre: é melhor esperar por Boaz do que se casar com a armadilha."}
    ]
  }
  $json$::jsonb
)
on conflict (slug) do nothing;
