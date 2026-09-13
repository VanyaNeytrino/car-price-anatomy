// src/lib/session.ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Почему это существует отдельным хелпером.
 *
 * Prisma трактует `where: { organizationId: undefined }` не как «ничего не найдено»,
 * а как «фильтра нет». Поэтому сессия без organizationId (старый JWT, сбой колбэка)
 * раньше показывала админу машины всех организаций и давала открыть чужую.
 * Ни одна страница не должна доставать organizationId из сессии напрямую — только
 * через эти две функции, которые гарантируют непустую строку.
 */

export type ActiveSession = {
  organizationId: string;
  email: string;
  name: string | null;
};

async function readSession(): Promise<ActiveSession | null> {
  const session = await auth();
  const organizationId = session?.user?.organizationId;

  if (!session?.user || typeof organizationId !== "string" || organizationId === "") {
    return null;
  }

  return {
    organizationId,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
  };
}

/** Для страниц и layout: нет организации — отправляем на вход. */
export async function requireOrg(): Promise<ActiveSession> {
  const session = await readSession();
  if (!session) redirect("/login");
  return session;
}

/** Для server actions: нет организации — падаем, а не молча пишем в чужие данные. */
export async function requireOrgForAction(): Promise<ActiveSession> {
  const session = await readSession();
  if (!session) throw new Error("Требуется вход в систему");
  return session;
}
