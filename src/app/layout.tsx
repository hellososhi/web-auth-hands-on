import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "みんなのメモ | Web Auth Hands-on",
  description: "共有メモアプリから、認証と認可の仕組みを学ぶ教材です。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

