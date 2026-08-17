import PixTesteCliente from "./PixTesteCliente";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Checkout PIX (teste)",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PixTesteCliente />;
}
