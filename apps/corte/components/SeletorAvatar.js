"use client";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import { AVATARES } from "@/lib/avatares";

export default function SeletorAvatar({ name = "avatar", inicial }) {
  const [sel, setSel] = useState(inicial || AVATARES[0].id);
  return (
    <div>
      <input type="hidden" name={name} value={sel} />
      <div className="av-grid">
        {AVATARES.map((a) => (
          <button type="button" key={a.id} className={"av-cell" + (sel === a.id ? " on" : "")} onClick={() => setSel(a.id)} aria-label={`Avatar ${a.id}`}>
            <Avatar preset={a} size={52} />
          </button>
        ))}
      </div>
    </div>
  );
}
