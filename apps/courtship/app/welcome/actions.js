"use server";

import { redirect } from "next/navigation";
import { criarSupabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Post-purchase WITHOUT email: sets the password of the just-created account and logs in.
 *  Only works while the account is `setup_pendente` and inside the window — otherwise it
 *  points the buyer to the login. */
export async function definirAcessoBoasVindas({ email, senha, confirma }) {
  email = String(email || "").trim().toLowerCase();
  senha = String(senha || "");
  if (!email.includes("@")) return { erro: "Please confirm the email you used at checkout." };
  if (senha.length < 6) return { erro: "Your password needs at least 6 characters." };
  if (senha !== String(confirma || "")) return { erro: "The passwords don't match." };

  const admin = supabaseAdmin();
  let user = null, pagina = 1;
  while (pagina <= 10 && !user) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    const users = data?.users || [];
    user = users.find((u) => (u.email || "").toLowerCase() === email);
    if (users.length < 1000) break;
    pagina++;
  }
  if (!user) return { erro: "We couldn't find an account with that email. Use the SAME email as your purchase — access takes a few seconds." };

  const { data: m } = await admin.from("ca_membros").select("setup_pendente, setup_expira_em").eq("user_id", user.id).maybeSingle();
  const pendente = m?.setup_pendente && m?.setup_expira_em && new Date(m.setup_expira_em).getTime() > Date.now();
  if (!pendente) return { jaConfigurada: true };

  const { error: e1 } = await admin.auth.admin.updateUserById(user.id, { password: senha });
  if (e1) return { erro: e1.message };
  await admin.from("ca_membros").update({ setup_pendente: false, setup_expira_em: null }).eq("user_id", user.id);

  const sb = await criarSupabaseServer();
  const { error: e2 } = await sb.auth.signInWithPassword({ email, password: senha });
  if (e2) return { erro: "Password set, but the automatic login failed. Tap Log in." };
  redirect("/");
}
