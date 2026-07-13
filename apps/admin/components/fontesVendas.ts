import { Poppins, Manrope } from "next/font/google";

// Fontes do design "Premium Escuro" da landing — escopadas às páginas de vendas
// (aplica-se .variable no wrapper; o resto do app NÃO é afetado). Poppins = títulos,
// Manrope = corpo. Expostas como CSS vars --fv-titulo / --fv-corpo.
export const fonteTitulo = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--fv-titulo",
  display: "swap",
});
export const fonteCorpo = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--fv-corpo",
  display: "swap",
});
