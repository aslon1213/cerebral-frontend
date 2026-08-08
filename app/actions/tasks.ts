"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/server";
import type { Priority, TaskStatus } from "@/lib/api/types";

import { optionalDateTime, optionalText, toActionState, type ActionState } from "./action-state";

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await api.tasks.create({
      project_id: String(formData.get("project_id") ?? ""),
      name: String(formData.get("name") ?? "").trim(),
      description: optionalText(formData, "description") ?? null,
      priority: (optionalText(formData, "priority") as Priority) ?? "low",
      status: (optionalText(formData, "status") as TaskStatus) ?? "todo",
      due_date: optionalDateTime(formData, "due_date") ?? null,
      label_ids: formData.getAll("label_ids").map(String).filter(Boolean),
    });
  } catch (error) {
    return toActionState(error, "Could not create the task.");
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${String(formData.get("project_id") ?? "")}`);
  return { ok: true };
}

export async function updateTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) return { error: "Missing task id." };

  try {
    await api.tasks.update(taskId, {
      name: String(formData.get("name") ?? "").trim(),
      description: optionalText(formData, "description") ?? null,
      priority: optionalText(formData, "priority") as Priority,
      status: optionalText(formData, "status") as TaskStatus,
      due_date: optionalDateTime(formData, "due_date") ?? null,
    });
  } catch (error) {
    return toActionState(error, "Could not update the task.");
  }

  revalidatePath("/tasks");
  return { ok: true };
}

/** Inline status change from a list row — no form state, just re-render. */
export async function setTaskStatusAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("task_id") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!taskId || !status) return;

  await api.tasks.update(taskId, { status });
  revalidatePath("/tasks");

  const projectId = String(formData.get("project_id") ?? "");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function deleteTaskAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) return;

  await api.tasks.remove(taskId);
  revalidatePath("/tasks");

  const projectId = String(formData.get("project_id") ?? "");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function setTaskLabelAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("task_id") ?? "");
  const labelId = String(formData.get("label_id") ?? "");
  if (!taskId || !labelId) return;

  if (String(formData.get("attached") ?? "") === "1") {
    await api.tasks.detachLabel(taskId, labelId);
  } else {
    await api.tasks.attachLabel(taskId, labelId);
  }
  revalidatePath("/tasks");
}
