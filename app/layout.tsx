import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draftmin - Premium Video Meetings",
  description: "Crystal clear video meetings with real-time transcription, HD quality, and advanced analytics. Connect with anyone, anywhere.",
  keywords: ["video meetings", "conferencing", "collaboration", "transcription"],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
