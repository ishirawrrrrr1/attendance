"use server";

import { redirect } from "next/navigation";

import { clearSession } from "@/lib/auth/session";

export async function logoutAction() {
  await clearSession();
  redirect("/login?success=Logged%20out%20successfully.");
}
