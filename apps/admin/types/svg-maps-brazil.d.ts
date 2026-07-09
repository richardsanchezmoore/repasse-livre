declare module "@svg-maps/brazil" {
  /** Mapa do Brasil em paths SVG. id = sigla da UF em minúsculo (ex.: "sp"). */
  const mapa: {
    label: string;
    viewBox: string;
    locations: { id: string; name: string; path: string }[];
  };
  export default mapa;
}
