import FunilSwipe from "./FunilSwipe";

// Landing PRINCIPAL México (/es/mujer) — versión en español del funil de la Lady.
// Vende el Kit a ~MXN $299 vía Hotmart (widget popup). Precio es CONTENIDO aquí
// (Hotmart es la fuente real en el checkout). noindex hasta el lanzamiento.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "¿Por qué aún no estás viviendo la relación que te gustaría?",
  description:
    "Hay una parte de la dinámica de las relaciones que sucede antes de que una relación empiece. Una conversación con la Lady.",
  robots: { index: false, follow: false }, // quitar cuando salga a producción
  alternates: { canonical: "/es/mujer" },
};

export default function LandingMujer() {
  // Precio de exhibición (el checkout del Hotmart manda de verdad). Ancla opcional.
  const preco = process.env.NEXT_PUBLIC_PRECIO_MX || "MXN $299";
  const precoDe = process.env.NEXT_PUBLIC_PRECIO_MX_DE || "";
  return (
    <main className="sw-main">
      <FunilSwipe preco={preco} precoDe={precoDe} />
    </main>
  );
}
