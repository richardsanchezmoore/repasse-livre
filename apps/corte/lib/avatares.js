// Avatares ilustrados de "pretendentes" (cavalheiros), multi-étnicos.
// Paramétrico: tom de pele × cabelo × barba × fundo pastel. SVG puro (leve).

export const AVATARES = [
  { id: "a1",  pele: "#f2d2b6", cabelo: "#5a3a1e", estilo: "curto",    barba: false, fundo: "#c6d4e1" },
  { id: "a2",  pele: "#eabf95", cabelo: "#1c1c1c", estilo: "ondulado", barba: true,  fundo: "#e6d3a3" },
  { id: "a3",  pele: "#d69f6e", cabelo: "#1c1c1c", estilo: "crespo",   barba: false, fundo: "#d8c3cb" },
  { id: "a4",  pele: "#b97a4e", cabelo: "#3b2415", estilo: "curto",    barba: true,  fundo: "#cfe0d2" },
  { id: "a5",  pele: "#8d5524", cabelo: "#1c1c1c", estilo: "crespo",   barba: true,  fundo: "#e5d5c3" },
  { id: "a6",  pele: "#6b4226", cabelo: "#1c1c1c", estilo: "curto",    barba: false, fundo: "#c6d4e1" },
  { id: "a7",  pele: "#4a2f1b", cabelo: "#1c1c1c", estilo: "crespo",   barba: true,  fundo: "#e6d3a3" },
  { id: "a8",  pele: "#f2d2b6", cabelo: "#b98a3e", estilo: "ondulado", barba: false, fundo: "#d8c3cb" },
  { id: "a9",  pele: "#d69f6e", cabelo: "#5a3a1e", estilo: "curto",    barba: false, fundo: "#cfe0d2" },
  { id: "a10", pele: "#eabf95", cabelo: "#6e3b1e", estilo: "curto",    barba: true,  fundo: "#e5d5c3" },
  { id: "a11", pele: "#8d5524", cabelo: "#1c1c1c", estilo: "careca",   barba: true,  fundo: "#c6d4e1" },
  { id: "a12", pele: "#b97a4e", cabelo: "#8a8a8a", estilo: "curto",    barba: false, fundo: "#e6d3a3" },
];

export function getAvatar(id) {
  return AVATARES.find((a) => a.id === id) || null;
}
