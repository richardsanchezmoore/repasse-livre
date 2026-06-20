import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;
const BUCKET = "oportunidades-fotos";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const foto = formData.get("foto");

  if (!(foto instanceof File) || foto.size === 0) {
    return NextResponse.json({ erro: "Envie uma foto válida." }, { status: 400 });
  }
  if (!foto.type.startsWith("image/")) {
    return NextResponse.json({ erro: "Só são aceitas imagens." }, { status: 400 });
  }
  if (foto.size > TAMANHO_MAXIMO_FOTO) {
    return NextResponse.json({ erro: "A foto deve ter no máximo 5MB." }, { status: 400 });
  }

  const caminho = `${randomUUID()}-${foto.name}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(caminho, foto, {
    contentType: foto.type,
  });
  if (error) {
    return NextResponse.json({ erro: "Falha ao enviar a foto. Tente novamente." }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(caminho);
  return NextResponse.json({ url: data.publicUrl, caminho });
}

export async function DELETE(request: NextRequest) {
  const { caminho } = await request.json();
  if (typeof caminho !== "string" || !caminho) {
    return NextResponse.json({ erro: "Caminho inválido." }, { status: 400 });
  }
  await supabaseAdmin.storage.from(BUCKET).remove([caminho]);
  return NextResponse.json({ ok: true });
}
