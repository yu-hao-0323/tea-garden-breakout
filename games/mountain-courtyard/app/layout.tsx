import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "山间小院 · 种一院清欢",
  description: "种茶、制点心、招待山间来客，慢慢经营自己的小院。名字和密码登录，进度自动保存。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
