import "./globals.css";

export const metadata = {
  title: "The Courtship Almanac",
  description: "Learn to read the signs — before the altar. A Regency-styled discernment kit for Christian women.",
};

export const viewport = {
  themeColor: "#f3ead6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,900;1,500;1,700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Pinyon+Script&display=swap"
          rel="stylesheet"
        />
        {/* TODO(US): Meta Pixel próprio do mercado americano (novo dataset/pixel — NÃO reusar o BR). */}
      </head>
      <body>{children}</body>
    </html>
  );
}
