"use server";

import { redirect } from "next/navigation";

import { setSession } from "@/lib/auth/session";
import { verifyLogin } from "@/lib/db/queries";

export async function loginAction(formData: FormData) {
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!login || !password) {
    redirect("/login?error=Please%20enter%20your%20credentials.");
  }

  const user = await verifyLogin(login, password);

  if (!user) {
    redirect("/login?error=Invalid%20email%2Fusername%20or%20password.");
  }

  await setSession(user);
  redirect("/dashboard?success=Logged%20in%20successfully.");
}
