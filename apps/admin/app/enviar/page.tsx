import { FormularioEnvio } from "@/components/FormularioEnvio";

export const dynamic = "force-dynamic";

export default function EnviarOportunidadePage() {
  const siteKeyTurnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  return (
    <main className="pagina-publica">
      <h1>Envie uma oportunidade</h1>
      <p className="pagina-publica-intro">
        Encontrou um carro abaixo da tabela FIPE? Envie aqui — se a margem for
        de pelo menos 5%, sua oportunidade entra na fila de revisão.
      </p>
      <FormularioEnvio siteKeyTurnstile={siteKeyTurnstile} />
    </main>
  );
}
