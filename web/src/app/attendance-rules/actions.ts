"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { updateAttendanceRules } from "@/lib/db/queries";

function redirectWithMessage(type: "success" | "error", message: string) {
  redirect(`/attendance-rules?${type}=${encodeURIComponent(message)}`);
}

export async function updateAttendanceRulesAction(formData: FormData) {
  await requireAdminSession();

  try {
    await updateAttendanceRules(formData);
    revalidatePath("/attendance-rules");
    revalidatePath("/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update attendance time rules.";
    redirectWithMessage("error", message);
  }

  redirectWithMessage("success", "Attendance time rules updated successfully.");
}
