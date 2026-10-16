/**
 * BANDEIRAS EM SVG — e não emoji.
 *
 * ⚠️⚠️ MEDIDO, não suposto: com emoji (🇵🇾 🇧🇷) o seletor apareceu no Chrome do
 * Windows como as letras "PY" e "BR" dentro de uma caixinha. O Windows não traz
 * fonte para os emojis de bandeira (são pares de "indicadores regionais", e sem
 * a ligadura na fonte o navegador desenha as duas letras cruas). Nenhum
 * navegador contorna isso — é a fonte do sistema que falta.
 *
 * ★ Como metade do público-alvo acessa de celular (Android/iOS mostram a
 * bandeira) e a outra metade de desktop Windows (não mostra), emoji daria um
 * site que parece quebrado para metade das pessoas. SVG desenha igual nos dois.
 *
 * ★ Desenho simplificado de propósito: 20×14px não comporta o brasão do
 * Paraguai nem a esfera do Brasil. O que identifica nesse tamanho é a faixa de
 * cor, e é o que está aqui.
 */

export function BandeiraParaguai({ tamanho = 20 }: { tamanho?: number }) {
  const alt = Math.round((tamanho * 3) / 5);
  return (
    <svg width={tamanho} height={alt} viewBox="0 0 15 9" role="img" aria-hidden="true" className="bandeira">
      <rect width="15" height="3" fill="#D52B1E" />
      <rect y="3" width="15" height="3" fill="#FFFFFF" />
      <rect y="6" width="15" height="3" fill="#0038A8" />
      {/* O disco central, única pista do brasão que sobrevive em 20px. */}
      <circle cx="7.5" cy="4.5" r="1.5" fill="#FFFFFF" stroke="#0038A8" strokeWidth="0.3" />
    </svg>
  );
}

export function BandeiraBrasil({ tamanho = 20 }: { tamanho?: number }) {
  const alt = Math.round((tamanho * 3) / 5);
  return (
    <svg width={tamanho} height={alt} viewBox="0 0 15 9" role="img" aria-hidden="true" className="bandeira">
      <rect width="15" height="9" fill="#009B3A" />
      <path d="M7.5 1 14 4.5 7.5 8 1 4.5Z" fill="#FEDF00" />
      <circle cx="7.5" cy="4.5" r="2" fill="#002776" />
    </svg>
  );
}

/** Pelo código do idioma, para o seletor não precisar de um `if` na marcação. */
export function BandeiraDoIdioma({ codigo, tamanho = 20 }: { codigo: string; tamanho?: number }) {
  return codigo === "pt" ? <BandeiraBrasil tamanho={tamanho} /> : <BandeiraParaguai tamanho={tamanho} />;
}

/**
 * ★★ BANDEIRA DA MOEDA — Gustavo, 16/10/2026: *"o preço na mesma cor sendo
 * dólar ou guarani confunde os olhos; talvez colocar do lado do preço a
 * bandeira do país"*.
 *
 * Ele está certo e o problema é real da praça: o MESMO carro é anunciado em
 * guarani por um vendedor e em dólar por outro, e numa listagem os dois
 * números ficam na mesma tipografia e na mesma cor. "₲ 55.000.000" e
 * "US$ 9.644" só se distinguem lendo o símbolo, que é a parte pequena.
 *
 * ★ A bandeira resolve ANTES da leitura: a cor é reconhecida de relance, que
 * é exatamente o que falta quando se passa o olho por vinte cards.
 */
export function BandeiraEUA({ tamanho = 20 }: { tamanho?: number }) {
  const alt = Math.round((tamanho * 3) / 5);
  return (
    <svg width={tamanho} height={alt} viewBox="0 0 15 9" role="img" aria-hidden="true" className="bandeira">
      <rect width="15" height="9" fill="#FFFFFF" />
      {/* ⚠️ Sete faixas, não treze: em 20px treze viram um borrão cinza. */}
      {[0, 2, 4, 6, 8].map((y) => (
        <rect key={y} y={y} width="15" height="1" fill="#B22234" />
      ))}
      <rect width="6" height="5" fill="#3C3B6E" />
    </svg>
  );
}

export function BandeiraArgentina({ tamanho = 20 }: { tamanho?: number }) {
  const alt = Math.round((tamanho * 3) / 5);
  return (
    <svg width={tamanho} height={alt} viewBox="0 0 15 9" role="img" aria-hidden="true" className="bandeira">
      <rect width="15" height="9" fill="#74ACDF" />
      <rect y="3" width="15" height="3" fill="#FFFFFF" />
      <circle cx="7.5" cy="4.5" r="1.1" fill="#F6B40E" />
    </svg>
  );
}

/** Pela moeda, para o preço não precisar de um `switch` na marcação. */
export function BandeiraDaMoeda({ codigo, tamanho = 16 }: { codigo: string; tamanho?: number }) {
  if (codigo === "USD") return <BandeiraEUA tamanho={tamanho} />;
  if (codigo === "BRL") return <BandeiraBrasil tamanho={tamanho} />;
  if (codigo === "ARS") return <BandeiraArgentina tamanho={tamanho} />;
  return <BandeiraParaguai tamanho={tamanho} />;
}
