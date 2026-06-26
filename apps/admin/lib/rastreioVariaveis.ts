// Parte client-safe de lib/rastreio.ts — sem nenhum import de supabase.
// Componentes "use client" (ex.: PainelRastreio.tsx) devem importar daqui,
// nunca de "@/lib/rastreio" direto, senão o bundler arrasta o cliente
// Supabase (com a service key) pro navegador e ele quebra: SUPABASE_URL não
// é uma env var pública, então some no bundle do cliente e o módulo lança
// erro ao avaliar (mesma armadilha documentada em seoVariaveis.ts).
export const CHAVES_RASTREIO = ["ga_measurement_id", "gtm_id", "meta_pixel_id", "scripts_extra"] as const;
export type ChaveRastreio = (typeof CHAVES_RASTREIO)[number];
