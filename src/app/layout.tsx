import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADTranscribe",
  description: "Transcrição de áudio e vídeo simples e privada",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
