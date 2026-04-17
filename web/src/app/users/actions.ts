"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { deleteUser, saveUser } from "@/lib/db/queries";

function redirectWithMessage(path: string, type: "error" | "success", message: string) {
  const encoded = encodeURIComponent(message);
  redirect(`${path}?${type}=${encoded}`);
}

export async function saveUserAction(formData: FormData) {
  const admin = await requireAdminSession();
  const id = String(formData.get("id") ?? "").trim();
  const isEditing = Boolean(id);

  try {
    await saveUser(formData, admin.id);
    revalidatePath("/users");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save user.";
    if (isEditing) {
      redirect(`/users?modal=open&mode=edit&edit=${encodeURIComponent(id)}&error=${encodeURIComponent(message)}`);
    }

    redirect(`/users?modal=open&mode=create&error=${encodeURIComponent(message)}`);
  }

  redirectWithMessage("/users", "success", id ? "User updated successfully." : "User created successfully.");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdminSession();
  const id = Number(formData.get("id"));

  try {
    await deleteUser(id, admin.id);
    revalidatePath("/users");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete user.";
    redirectWithMessage("/users", "error", message);
  }

  redirectWithMessage("/users", "success", "User deleted successfully.");
}
