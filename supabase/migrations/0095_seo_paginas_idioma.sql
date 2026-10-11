-- ════════════════════════════════════════════════════════════════════════════
-- O SEO PASSA A CONHECER IDIOMA.
--
-- ★ O problema que isto fecha: a aba do navegador ainda dizia "Repasse Livre —
-- Carros abaixo da tabela FIPE", em PORTUGUÊS, num site paraguaio onde a FIPE
-- não existe. E não era código: título e descrição vêm desta tabela, com
-- `chave` como chave primária e nenhuma noção de idioma. Traduzir era migração.
--
-- ⚠️ AS LINHAS QUE JÁ EXISTEM SÃO PORTUGUÊS — são da era Brasil. Por isso o
-- default é 'pt' e não 'es': rotular o que já está lá como espanhol seria
-- mentira no dado, e a home em espanhol passaria a servir texto em português
-- sem ninguém notar.
--
-- ★ Chave primária composta (chave, idioma): a mesma página existe uma vez por
-- idioma, e `buscarConfigSeo('home', 'es')` acha a certa sem gambiarra de
-- sufixo no nome da chave.
-- ════════════════════════════════════════════════════════════════════════════

alter table seo_paginas add column if not exists idioma text not null default 'pt';

alter table seo_paginas drop constraint if exists seo_paginas_pkey;
alter table seo_paginas add primary key (chave, idioma);

-- ═══ O texto do Auto Radar PY ═══
--
-- ★★ A PROMESSA MUDOU e o título tem que mudar junto. No Brasil era "abaixo da
-- tabela FIPE" — comparação contra uma referência que já existia. No Paraguai
-- não existe tabela nenhuma, e o produto é JUSTAMENTE criá-la. Então o título
-- não promete desconto: promete a referência.
--
-- ⚠️ "AutoRadarPy" no título mesmo antes do domínio trocar: é o nome que o selo
-- do card já usa ("por debajo de la tabla AutoRadarPy"), e o Google leva meses
-- para associar marca a domínio. Começar agora é ganhar esse tempo.

insert into seo_paginas (chave, idioma, titulo, descricao) values
  ('home', 'es',
   'AutoRadarPy — Precios reales de autos usados en Paraguay',
   'La tabla de precios de referencia del mercado paraguayo, por marca, modelo y año. Calculada sobre los anuncios reales publicados en Paraguay, con el rango del mercado a la vista.'),
  ('home', 'pt',
   'AutoRadarPy — Preços reais de carros usados no Paraguai',
   'A tabela de preços de referência do mercado paraguaio, por marca, modelo e ano. Calculada sobre os anúncios reais publicados no Paraguai, com a faixa do mercado à vista.')
on conflict (chave, idioma) do update
  set titulo = excluded.titulo,
      descricao = excluded.descricao,
      atualizado_em = now();

comment on column seo_paginas.idioma is
  'Idioma desta linha. As linhas antigas sao da era Brasil e por isso o default e pt — rotular como es serviria texto em portugues na home em espanhol.';
