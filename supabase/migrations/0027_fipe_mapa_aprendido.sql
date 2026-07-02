-- Base APRENDIDA de mapeamento veículo→código FIPE, alimentada pela âncora de
-- valor da OLX. A OLX (e portais grandes) puxa o FIPE direto da fonte oficial
-- quando o vendedor escolhe marca/modelo/versão/ano nos dropdowns — então o
-- VALOR exibido é exato, mesmo com o texto livre do anúncio bagunçado. Quando o
-- resolvedor encaixa o valor da página num código oficial (mês vigente OU
-- anterior — a OLX congela o FIPE na inserção do anúncio), gravamos aqui o
-- mapeamento. Nas próximas vezes o mesmo veículo resolve por HIT direto: zero
-- fuzzy, zero chamada FIPE, e a base se autocorrige/enriquece com o tempo.
-- Ver project_repasse_livre_fipe_ancora_valor_olx.
--
-- assinatura = normalização do texto do veículo (versão/modelo) + ano; é a
-- chave que generaliza entre anúncios do mesmo carro. O valor guardado é o do
-- mês em que foi confirmado (referência), só pra auditoria — o código é o que
-- importa (estável entre meses).

create table if not exists fipe_mapa_aprendido (
  assinatura text not null,
  ano int not null,
  codigo_fipe text not null,
  ano_modelo int not null,
  valor_centavos_confirmado bigint,
  nome_modelo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (assinatura, ano)
);
