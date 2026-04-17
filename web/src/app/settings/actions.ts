"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserSession, setSession } from "@/lib/auth/session";
import { updateOwnAccount } from "@/lib/db/queries";

function redirectWithMessage(type: "success" | "error", message: string) {
  redirect(`/settings?${type}=${encodeURIComponent(message)}`);
}

export async function updateAccountSettingsAction(formData: FormData) {
  const user = await requireUserSession();

  try {
    const updated = await updateOwnAccount(user.id, formData);
    await setSession({
      id: updated.id,
      name: updated.name,
      username: updated.username,
      avatar_data_url: updated.avatar_data_url ?? null,
      role: updated.role
    });
    revalidatePath("/settings");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update account settings.";
    redirectWithMessage("error", message);
  }

  redirectWithMessage("success", "Account settings updated successfully.");
}
