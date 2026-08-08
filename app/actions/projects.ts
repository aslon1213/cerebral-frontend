"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { api } from "@/lib/api/server";
import type { Priority, ProjectUpdate } from "@/lib/api/types";

import {
  linesToArray,
  optionalDateTime,
  optionalText,
  toActionState,
  type ActionState,
} from "./action-state";

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await api.projects.create({
      name: String(formData.get("name") ?? "").trim(),
      description: optionalText(formData, "description") ?? null,
      priority: (optionalText(formData, "priority") as Priority) ?? "low",
      started_date: optionalDateTime(formData, "started_date") ?? null,
      target_date: optionalDateTime(formData, "target_date") ?? null,
      goals: linesToArray(formData, "goals"),
      label_ids: formData.getAll("label_ids").map(String).filter(Boolean),
    });
  } catch (error) {
    return toActionState(error, "Could not create the project.");
  }

  revalidatePath("/projects");
  return { ok: true };
}

export async function updateProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return { error: "Missing project id." };

  // Only send what the form actually carries, so a partial form can't blank
  // out fields it never showed.
  const payload: ProjectUpdate = {
    name: String(formData.get("name") ?? "").trim(),
    description: optionalText(formData, "description") ?? null,
    priority: optionalText(formData, "priority") as Priority,
    started_date: optionalDateTime(formData, "started_date") ?? null,
    target_date: optionalDateTime(formData, "target_date") ?? null,
    goals: linesToArray(formData, "goals"),
  };

  try {
    await api.projects.update(projectId, payload);
  } catch (error) {
    return toActionState(error, "Could not update the project.");
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { ok: true };
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  await api.projects.remove(projectId);
  revalidatePath("/projects");

  // Deleting from the detail page leaves nowhere to return to.
  if (String(formData.get("redirect_to_list") ?? "") === "1") {
    redirect("/projects");
  }
}

export async function setProjectLabelAction(formData: FormData): Promise<void> {
  const projectId = String(formData.get("project_id") ?? "");
  const labelId = String(formData.get("label_id") ?? "");
  if (!projectId || !labelId) return;

  if (String(formData.get("attached") ?? "") === "1") {
    await api.projects.detachLabel(projectId, labelId);
  } else {
    await api.projects.attachLabel(projectId, labelId);
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}
