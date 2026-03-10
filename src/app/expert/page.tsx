import type { Metadata } from "next";
import ExpertCabinetClient from "./ExpertCabinetClient";
import styles from "./expert.module.css";

export const metadata: Metadata = {
  title: "Личный кабинет эксперта — МФТИ",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ExpertPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className={styles.denied}>
        <h1 className={styles.deniedTitle}>Нет доступа</h1>
        <p className={styles.deniedText}>
          Используйте персональную ссылку, полученную от администратора.
        </p>
      </div>
    );
  }

  return <ExpertCabinetClient token={token} />;
}
