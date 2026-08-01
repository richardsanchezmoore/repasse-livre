"use server";

import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Pós-compra SEM email: define a senha da conta recém-criada e já loga. Só funciona
 *  enquanto a conta está `setup_pendente` e dentro da janela (2h) — senão manda pro login. */
export async function definirAcessoBoasVindas({ email, senha, confirma }) {
  email = String(email || "").trim().toLowerCase();
  senha = String(senha || "");
  if (!email.includes("@")) return { erro: "Confirme o e-mail que você usou na compra." };
  if (senha.length < 6) return { erro: "A senha precisa de ao menos 6 caracteres." };
  if (senha !== String(confirma || "")) return { erro: "As senhas não conferem." };

  const admin = supabaseAdmin();
  let user = null, pagina = 1;
  while (pagina <= 10 && !user) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    const users = data?.users || [];
    user = users.find((u) => (u.email || "").toLowerCase() === email);
    if (users.length < 1000) break;
    pagina++;
  }
  if (!user) return { erro: "Não encontramos uma conta com esse e-mail. Use o MESMO e-mail da compra — a liberação leva alguns segundos." };

  const { data: m } = await admin.from("corte_membros").select("setup_pendente, setup_expira_em").eq("user_id", user.id).maybeSingle();
  const pendente = m?.setup_pendente && m?.setup_expira_em && new Date(m.setup_expira_em).getTime() > Date.now();
  if (!pendente) return { jaConfigurada: true };

  const { error: e1 } = await admin.auth.admin.updateUserById(user.id, { password: senha });
  if (e1) return { erro: e1.message };
  await admin.from("corte_membros").update({ setup_pendente: false, setup_expira_em: null }).eq("user_id", user.id);

  const sb = await criarSupabaseServer();
  const { error: e2 } = await sb.auth.signInWithPassword({ email, password: senha });
  if (e2) return { erro: "Senha definida, mas o login automático falhou. Toque em Entrar." };
  redirect("/biblioteca");
}
