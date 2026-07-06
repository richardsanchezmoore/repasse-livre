import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Carrega .env.local pro process.env ANTES dos módulos que leem env no import
 * (@/lib/supabase, parecerLLM). Deve ser o PRIMEIRO import de qualquer script
 * standalone rodado por tsx (fora do Next, que carrega .env.local sozinho).
 * Não sobrescreve o que já veio do ambiente (ex.: CI/produção).
 */
try {
  const txt = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const linha of txt.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* sem .env.local — segue com o env do processo */
}
