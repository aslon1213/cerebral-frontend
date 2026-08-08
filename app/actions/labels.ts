"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/server";

import { optionalText, toActionState, type ActionState } from "./action-state";

export async function createLabelAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await api.labels.create({
      name: String(formData.get("name") ?? "").trim(),
      description: optionalText(formData, "description") ?? null,
    });
  } catch (error) {
    // `duplicate_label_name` is a 409 with a clear message, so it flows through
    // as a form-level error without special casing.
    return toActionState(error, "Could not create the label.");
  }

  revalidatePath("/labels");
  return { ok: true };
}

export async function updateLabelAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const labelId = String(formData.get("label_id") ?? "");
  if (!labelId) return { error: "Missing label id." };

  try {
    await api.labels.update(labelId, {
      name: String(formData.get("name") ?? "").trim(),
      description: optionalText(formData, "description") ?? null,
    });
  } catch (error) {
    return toActionState(error, "Could not update the label.");
  }

  revalidatePath("/labels");
  return { ok: true };
}

export async function deleteLabelAction(formData: FormData): Promise<void> {
  const labelId = String(formData.get("label_id") ?? "");
  if (!labelId) return;

  await api.labels.remove(labelId);
  revalidatePath("/labels");
  revalidatePath("/projects");
  revalidatePath("/tasks");
}
