-- Sprint 2: "favoritar" é independente do status de aprovação/rejeição,
-- por isso vira uma coluna própria em vez de mais um valor de status.

alter table opportunities
  add column if not exists favorito boolean not null default false;
