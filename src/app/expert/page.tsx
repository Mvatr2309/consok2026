import type { Metadata } from "next";
import { cookies } from "next/headers";
import ExpertCabinetClient from "./ExpertCabinetClient";
import ExpertLoginClient from "./ExpertLoginClient";

export const metadata: Metadata = {
  title: "Личный кабинет эксперта — МФТИ",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ExpertPage({ searchParams }: Props) {
  const { token: queryToken } = await searchParams;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("expert_token")?.value;

  const token = queryToken || cookieToken;

  if (!token) {
    return <ExpertLoginClient />;
  }

  return <ExpertCabinetClient token={token} />;
}
