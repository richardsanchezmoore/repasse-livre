import "dotenv/config";
import { limparFbExpiradas } from "./fotosFacebook.js";

/**
 * Limpeza dos "extras" cruos do fbcdn já expirados nas fotos_secundarias (ver fotosFacebook).
 * Agendar 1×/dia (o front já esconde a quebrada na hora; isto só mantém o banco limpo e a
 * contagem "N fotos" honesta). Uso: tsx src/limparFotosFbExpiradas.ts
 */
async function main() {
  const r = await limparFbExpiradas();
  console.log(`Limpeza fbcdn expirado: ${r.ajustados} anúncios ajustados · ${r.removidas} links removidos.`);
}

main();
