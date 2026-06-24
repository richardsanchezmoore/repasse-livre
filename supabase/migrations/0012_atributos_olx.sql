alter table opportunities
  add column if not exists atributos_olx jsonb not null default '{}'::jsonb;

comment on column opportunities.atributos_olx is
  'Atributos opcionais extraídos da página do anúncio na OLX (cor, combustível, portas, único dono, etc.), como mapa { name: { label, value } }. Só contém as chaves que o anunciante preencheu.';
