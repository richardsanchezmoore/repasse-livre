"use client";
import { useRouter } from "next/navigation";
import { criarSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function LogoutButton() {
  const router = useRouter();
  async function sair() {
    await criarSupabaseBrowser().auth.signOut();
    router.push("/entrar");
    router.refresh();
  }
  return <button type="button" className="link-sutil" style={{ textAlign: "left" }} onClick={sair}>↩ Sair da conta</button>;
}
