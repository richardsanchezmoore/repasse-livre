"use client";
import { useState } from "react";
import FaxinaTracker from "@/components/FaxinaTracker";
import CasaPlanner from "@/components/CasaPlanner";

export default function CasaTabs({ faxina, salva = null, familia = null, logado = false }) {
  const [tab, setTab] = useState("faxina");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="tabs">
        <button className={tab === "faxina" ? "on" : ""} onClick={() => setTab("faxina")}>🧹 Minha faxina</button>
        <button className={tab === "marta" ? "on" : ""} onClick={() => setTab("marta")}>✨ Marta monta</button>
      </div>
      {tab === "faxina"
        ? <FaxinaTracker comodos={faxina.comodos} minutosSemana={faxina.minutosSemana} familia={familia} logado={logado} />
        : <CasaPlanner logado={logado} salva={salva} familia={familia} />}
    </div>
  );
}
