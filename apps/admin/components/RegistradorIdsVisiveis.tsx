"use client";

import { useEffect } from "react";
import { useSelecaoMultipla } from "./SelecaoMultiplaProvider";

/** Avisa o SelecaoMultiplaProvider quais ids estão na página/filtro atual, sem renderizar nada — usado pelo "Selecionar todos". */
export function RegistradorIdsVisiveis({ ids }: { ids: string[] }) {
  const { registrarIdsVisiveis } = useSelecaoMultipla();
  const chave = ids.join(",");

  useEffect(() => {
    registrarIdsVisiveis(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return null;
}
