"use server";

import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";

/** Normaliza um WhatsApp BR pra "55DDDNUMERO" (ou null se curto demais). */
function normWhats(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.startsWith("55") ? d : "55" + d;
}

/** Salva o perfil da família (a base que a Marta usa pra personalizar tudo). */
export async function salvarFamilia(dados) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { erro: "Sessão expirada. Entre de novo." };

  const filhos = (Array.isArray(dados?.filhos) ? dados.filhos : [])
    .map((f) => {
      const wa = normWhats(f?.whatsapp);
      return { nome: String(f?.nome || "").trim(), idade: f?.idade != null ? Number(f.idade) : null, ...(wa ? { whatsapp: wa } : {}) };
    })
    .filter((f) => f.nome || f.idade != null)
    .slice(0, 12);

  const maridoNome = String(dados?.marido_nome || "").trim() || null;
  const maridoWhats = normWhats(dados?.marido_whatsapp);

  // Contatos do one-tap: mescla os já salvos (adicionados na mão) com marido + filhos.
  const { data: fam } = await sb.from("lar_familia").select("contatos").eq("user_id", user.id).maybeSingle();
  const mapa = new Map((Array.isArray(fam?.contatos) ? fam.contatos : []).map((c) => [c.whatsapp, c]));
  if (maridoWhats) mapa.set(maridoWhats, { nome: maridoNome || "Marido", whatsapp: maridoWhats, papel: "marido" });
  for (const f of filhos) if (f.whatsapp) mapa.set(f.whatsapp, { nome: f.nome || "Filho(a)", whatsapp: f.whatsapp, papel: "filho" });
  const contatos = [...mapa.values()].slice(0, 20);

  const linha = {
    user_id: user.id,
    nome_mae: String(dados?.nome_mae || "").trim() || null,
    marido_nome: maridoNome,
    marido_whatsapp: maridoWhats,
    filhos,
    contatos,
    comodos: dados?.comodos != null ? Number(dados.comodos) : null,
    trabalha_fora: !!dados?.trabalha_fora,
    restricoes: String(dados?.restricoes || "").trim() || null,
    observacoes: String(dados?.observacoes || "").trim() || null,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await sb.from("lar_familia").upsert(linha, { onConflict: "user_id" });
  if (error) return { erro: error.message };
  redirect("/");
}

/** Salva um contato da família (nome + WhatsApp) para o "Enviar no WhatsApp". */
export async function salvarContato({ nome, whatsapp }) {
  const sb = await criarSupabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return { erro: "Entre na sua conta pra salvar contatos." };
  const dig = String(whatsapp || "").replace(/\D/g, "");
  if (dig.length < 10) return { erro: "Informe o WhatsApp com DDD." };
  const num = dig.startsWith("55") ? dig : "55" + dig;
  const nomeT = String(nome || "").trim() || "Contato";

  const { data: fam } = await sb.from("lar_familia").select("contatos").eq("user_id", auth.user.id).maybeSingle();
  const contatos = Array.isArray(fam?.contatos) ? fam.contatos : [];
  if (!contatos.some((c) => c.whatsapp === num)) contatos.push({ nome: nomeT, whatsapp: num });

  const { error } = await sb.from("lar_familia")
    .update({ contatos: contatos.slice(0, 12), atualizado_em: new Date().toISOString() })
    .eq("user_id", auth.user.id);
  if (error) return { erro: error.message };
  return { ok: true, contatos };
}
