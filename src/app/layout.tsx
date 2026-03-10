import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Запись на консультации — Центр «Пуск»",
  description: "Запись на групповые консультации экспертов по продуктам",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>
              Центр «Пуск» <span className={styles.logoAccent}>Консультации</span>
            </Link>
            <nav className={styles.nav}>
              <Link href="/" className={styles.navLink}>
                Программы
              </Link>
            </nav>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </body>
    </html>
  );
}
