import { buscarEstadosDisponiveis, contarOportunidades } from "@/components/DiscoveriesBoard";
import { NavegacaoProvider } from "@/components/NavegacaoProvider";
import { SelecaoMultiplaProvider } from "@/components/SelecaoMultiplaProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { GerenciadorBuscas, type BuscaSalvaRow, type AlertaRecebidoRow } from "@/components/GerenciadorBuscas";
import { buscarMarcasComContagem } from "@/lib/marcas";
import { UFS } from "@/lib/mascaras";
import { caminhoOportunidade } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import type { Oportunidade } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FMT_RECEBIDO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Campos do anúncio que o card de recebido + o link precisam. */
type AnuncioRecebido = Pick<
  Oportunidade,
  "id" | "veiculo" | "versao" | "ano" | "cidade" | "estado" | "origem_tipo" | "preco" | "fipe_valor" | "margem_percentual" | "foto_principal"
>;

export default async function BuscasPage() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return null; // guarda real (premium/admin) em app/(pro)/layout.tsx

  const [contagens, estadosDisponiveis, marcas, buscasResp, enviadosResp] = await Promise.all([
    contarOportunidades(usuario),
    buscarEstadosDisponiveis(),
    buscarMarcasComContagem(),
    supabaseAdmin
      .from("buscas_salvas")
      .select("id, nome, marca, modelo, preco_min, preco_max, estado, ano_min, ano_max, km_max, margem_min, frequencia, ativo, criado_em")
      .eq("user_id", usuario.id)
      .order("criado_em", { ascending: false }),
    // Alertas RECEBIDOS = pares já enviados (enviado_em preenchido), das buscas DESTE
    // usuário. Join inner igual ao entrega.ts. O anúncio some por FK cascade quando sai
    // do ar, então o que sobra aqui tem anúncio vivo pra linkar.
    supabaseAdmin
      .from("alertas_enviados")
      .select("opportunity_id, enviado_em, buscas_salvas!inner(user_id)")
      .eq("buscas_salvas.user_id", usuario.id)
      .not("enviado_em", "is", null)
      .order("enviado_em", { ascending: false })
      .limit(60),
  ]);

  const buscas = (buscasResp.data ?? []) as BuscaSalvaRow[];
  const nomesMarcas = marcas.map((m) => m.marca);

  // Carrega os anúncios dos alertas enviados e monta os cards de "recebidos".
  // Dedup por anúncio: se 2 buscas casaram o mesmo carro, mostra 1 card só (o
  // 1º = mais recente, pois vem ordenado por enviado_em desc).
  const enviadosBrutos = (enviadosResp.data ?? []) as Array<{ opportunity_id: string; enviado_em: string }>;
  const vistos = new Set<string>();
  const enviados = enviadosBrutos.filter((e) => {
    if (vistos.has(e.opportunity_id)) return false;
    vistos.add(e.opportunity_id);
    return true;
  });
  let recebidos: AlertaRecebidoRow[] = [];
  if (enviados.length > 0) {
    const oppIds = [...new Set(enviados.map((e) => e.opportunity_id))];
    const { data: ads } = await supabaseAdmin
      .from("opportunities")
      .select("id, veiculo, versao, ano, cidade, estado, origem_tipo, preco, fipe_valor, margem_percentual, foto_principal")
      .in("id", oppIds);
    const porId = new Map((ads ?? []).map((a) => [a.id as string, a as AnuncioRecebido]));
    recebidos = enviados
      .map((e): AlertaRecebidoRow | null => {
        const a = porId.get(e.opportunity_id);
        if (!a) return null; // anúncio saiu do ar entre o envio e agora
        return {
          id: a.id,
          veiculo: a.veiculo,
          ano: a.ano,
          cidade: a.cidade,
          estado: a.estado,
          preco: a.preco,
          fipeValor: a.fipe_valor,
          margem: a.margem_percentual,
          foto: a.foto_principal,
          href: caminhoOportunidade(a),
          recebidoEm: FMT_RECEBIDO.format(new Date(e.enviado_em)),
        };
      })
      .filter((x): x is AlertaRecebidoRow => x !== null);
  }

  return (
    <NavegacaoProvider>
      <SelecaoMultiplaProvider>
        <TopBar aba="aprovadas" estadosDisponiveis={estadosDisponiveis} usuario={usuario} />
        <div className="layout">
          <Sidebar abaAtiva="aprovadas" contagens={contagens} role={usuario.role} usuarioLogado={true} />
          <main className="conteudo">
            <GerenciadorBuscas buscas={buscas} marcas={nomesMarcas} estados={UFS} recebidos={recebidos} />
          </main>
        </div>
      </SelecaoMultiplaProvider>
    </NavegacaoProvider>
  );
}
