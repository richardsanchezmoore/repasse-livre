import { getAvatar } from "@/lib/avatares";

function Cabelo({ estilo, cor }) {
  if (estilo === "careca") return null;
  if (estilo === "crespo")
    return <path d="M28,43 C23,26 34,17 50,17 C66,17 77,26 72,43 C72,35 70,31 66,32 C67,26 60,23 58,25 C56,21 44,21 42,25 C40,23 33,26 34,32 C30,31 28,35 28,43 Z" fill={cor} />;
  if (estilo === "ondulado")
    return <path d="M29,41 C29,24 41,19 50,19 C59,19 71,24 71,41 C68,34 64,35 60,34 C57,31 52,32 50,33 C48,32 43,31 40,34 C36,35 32,34 29,41 Z" fill={cor} />;
  return <path d="M30,41 C30,24 40,19 50,19 C60,19 70,24 70,41 C70,31 62,27 50,27 C38,27 30,31 30,41 Z" fill={cor} />;
}

/** Avatar ilustrado. Passe `id` (a1..a12) ou um `preset`. Componente puro (server-safe). */
export default function Avatar({ id, preset, size = 44 }) {
  const a = preset || getAvatar(id) || getAvatar("a1") || { pele: "#e8b98f", cabelo: "#3b2415", estilo: "curto", barba: false, fundo: "#c6d4e1" };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", borderRadius: "50%" }} aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill={a.fundo} />
      <path d="M14,100 C14,80 33,72 50,72 C67,72 86,80 86,100 Z" fill="#2c3d52" />
      <path d="M50,72 L41,100 L47,100 L50,83 Z" fill="#cba85b" opacity="0.9" />
      <path d="M50,72 L59,100 L53,100 L50,83 Z" fill="#cba85b" opacity="0.9" />
      <rect x="44" y="60" width="12" height="15" rx="4" fill={a.pele} />
      <circle cx="31" cy="47" r="4" fill={a.pele} />
      <circle cx="69" cy="47" r="4" fill={a.pele} />
      <ellipse cx="50" cy="45" rx="19" ry="22" fill={a.pele} />
      {a.barba && <path d="M31,47 C32,64 41,70 50,70 C59,70 68,64 69,47 C61,57 39,57 31,47 Z" fill={a.cabelo} opacity="0.92" />}
      <Cabelo estilo={a.estilo} cor={a.cabelo} />
      <rect x="39" y="42" width="8" height="2" rx="1" fill={a.cabelo} />
      <rect x="53" y="42" width="8" height="2" rx="1" fill={a.cabelo} />
      <circle cx="43" cy="47" r="1.9" fill="#2c2833" />
      <circle cx="57" cy="47" r="1.9" fill="#2c2833" />
      {!a.barba && <path d="M44,55 Q50,59 56,55" stroke="#7c2b37" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
