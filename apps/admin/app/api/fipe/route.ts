import { listarAnosFipe, listarMarcasFipe, listarModelosFipe, buscarValorFipe } from "@/lib/fipe";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const recurso = searchParams.get("recurso");
  const marca = searchParams.get("marca");
  const modelo = searchParams.get("modelo");
  const ano = searchParams.get("ano");

  try {
    if (recurso === "marcas") {
      return Response.json(await listarMarcasFipe());
    }

    if (recurso === "modelos") {
      if (!marca) return Response.json({ erro: "Parâmetro 'marca' obrigatório." }, { status: 400 });
      return Response.json(await listarModelosFipe(marca));
    }

    if (recurso === "anos") {
      if (!marca || !modelo) {
        return Response.json({ erro: "Parâmetros 'marca' e 'modelo' obrigatórios." }, { status: 400 });
      }
      return Response.json(await listarAnosFipe(marca, modelo));
    }

    if (recurso === "valor") {
      if (!marca || !modelo || !ano) {
        return Response.json({ erro: "Parâmetros 'marca', 'modelo' e 'ano' obrigatórios." }, { status: 400 });
      }
      return Response.json(await buscarValorFipe(marca, modelo, ano));
    }

    return Response.json({ erro: "Parâmetro 'recurso' inválido." }, { status: 400 });
  } catch (erro) {
    return Response.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao consultar FIPE." },
      { status: 502 }
    );
  }
}
