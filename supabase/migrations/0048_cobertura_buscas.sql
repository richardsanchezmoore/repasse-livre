-- COBERTURA pro autocomplete das Buscas salvas (alertas PRO). O form NÃO pode
-- aceitar texto cru: um modelo digitado errado (ou inexistente na base) vira um
-- alerta que nunca dispara, em silêncio. Então marca/modelo/cidade vêm da NOSSA
-- base — o usuário escolhe da lista, não digita livre. Estas duas funções são a
-- fonte dessas listas. Ver project_repasse_livre_notificacoes_predefinicoes.
--
-- Convenção de extração IDÊNTICA à BIA (mig 0039/0041): marca = 1ª palavra do
-- `veiculo`, modelo = 2ª, com os mesmos casos especiais (Land Rover, Mercedes-Benz)
-- e initcap pra unificar caixas ("ONIX"→"Onix"). Assim o nome que aparece aqui é o
-- MESMO que a BIA mostra, e o match (case-insensitive) fecha certo.
-- search_path pinado (Security Advisor — ver project_repasse_livre_seguranca_rls_supabase).

-- ── Modelos cobertos por marca ──────────────────────────────────────────────────
-- Retorna TODOS os pares marca+modelo que existem na base (sem limite): a UI agrupa
-- por marca (universo de marcas = chaves distintas) e, ao escolher a marca, sugere
-- só os modelos dela. Ordena por volume dentro da marca (mais comum primeiro).
create or replace function buscas_modelos_cobertos()
returns table (marca text, modelo text, quantidade bigint)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with base as (
    select
      case
        when lower(split_part(veiculo, ' ', 1)) = 'land'
             and lower(split_part(veiculo, ' ', 2)) = 'rover' then 'Land Rover'
        when lower(split_part(veiculo, ' ', 1)) like 'mercedes%' then 'Mercedes-Benz'
        else initcap(split_part(veiculo, ' ', 1))
      end as marca,
      case
        when lower(split_part(veiculo, ' ', 1)) = 'land'
             and lower(split_part(veiculo, ' ', 2)) = 'rover' then initcap(split_part(veiculo, ' ', 3))
        else initcap(split_part(veiculo, ' ', 2))
      end as modelo
    from opportunities
    where origem_tipo = 'descoberta'
      and status != 'rejeitada'
      and split_part(veiculo, ' ', 1) != ''
      and split_part(veiculo, ' ', 2) != ''
  )
  select marca, modelo, count(*) as quantidade
  from base
  where marca <> ''
    and modelo <> ''
    -- Higiene da cauda (o `veiculo` é raspado; a 2ª palavra às vezes é lixo):
    and modelo ~ '^[A-Za-z0-9]'        -- começa com letra/dígito (corta "[Hidden…", pontuação)
    and modelo !~ '^(19|20)[0-9]{2}$'  -- não é um ANO (2010, 2020…) — mas MANTÉM "208", "500", "308"
  group by marca, modelo
  having count(*) >= 2                  -- ≥ 2 anúncios: corta typo/lixo de 1 ocorrência. Tunável.
  order by marca, quantidade desc;
$$;

-- ── Cidades cobertas por estado ─────────────────────────────────────────────────
-- Todas as cidades com anúncio na base, por UF (sem limite). A UI agrupa por estado
-- e, ao digitar, sugere só as cobertas; sem match → mensagem suave "amplie a busca".
-- mode() escolhe a grafia canônica (a cidade vem com caixa variada entre fontes);
-- agrupa case-insensitive pra não duplicar "Porto Alegre"/"PORTO ALEGRE".
create or replace function buscas_cidades_cobertas()
returns table (cidade text, estado text, quantidade bigint)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    mode() within group (order by cidade) as cidade,
    estado,
    count(*) as quantidade
  from opportunities
  where origem_tipo = 'descoberta'
    and status != 'rejeitada'
    and cidade is not null
    and estado is not null
    and trim(cidade) != ''
  group by lower(cidade), estado
  order by estado, quantidade desc;
$$;
