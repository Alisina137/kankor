import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "KankorPrep Admin",
  description: "KankorPrep administration foundation"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
