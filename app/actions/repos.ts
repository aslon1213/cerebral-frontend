"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";

import { optionalText, toActionState, type ActionState } from "./action-state";

/**
 * Repos are *connected*, not created.
 *
 * `POST /repos` is idempotent by name, so a bot can call it unconditionally at
 * startup. From a form that means submitting a name that already exists quietly
 * updates its path instead of failing — which is the useful behaviour, but only
 * if the person is told it is what happened.
 */
export interface RepoFormState extends ActionState {
  /** Set when the submission updated an existing repo rather than adding one. */
  reconnected?: boolean;
}

export async function connectRepoAction(
  _prevState: RepoFormState,
  formData: FormData,
): Promise<RepoFormState> {
  try {
    const result = await api.repos.connect({
      name: String(formData.get("name") ?? "").trim(),
      local_path: String(formData.get("local_path") ?? "").trim(),
      default_branch: optionalText(formData, "default_branch") ?? "main",
      remote_url: optionalText(formData, "remote_url") ?? null,
    });

    revalidatePath("/repos");
    return { ok: true, reconnected: !result.created };
  } catch (error) {
    return toActionState(error, "Could not connect that repo.");
  }
}

export async function updateRepoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const repoId = String(formData.get("repo_id") ?? "");
  if (!repoId) return { error: "Missing repo id." };

  try {
    await api.repos.update(repoId, {
      name: String(formData.get("name") ?? "").trim(),
      local_path: String(formData.get("local_path") ?? "").trim(),
      default_branch: optionalText(formData, "default_branch") ?? "main",
      remote_url: optionalText(formData, "remote_url") ?? null,
    });
  } catch (error) {
    return toActionState(error, "Could not update that repo.");
  }

  revalidatePath("/repos");
  revalidatePath(`/repos/${repoId}`);
  return { ok: true };
}

/**
 * Delete, or explain why not.
 *
 * `409 resource_in_use` means a run references this repo. A run is an audit
 * record, so the thing it points at cannot be deleted out from under it — that
 * is a rule worth restating rather than showing a bare conflict.
 */
export async function deleteRepoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const repoId = String(formData.get("repo_id") ?? "");
  if (!repoId) return { error: "Missing repo id." };

  try {
    await api.repos.remove(repoId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "resource_in_use") {
      return {
        error:
          "A recorded run references this repo, so it cannot be deleted — the run is an audit record and would lose what it points at.",
      };
    }
    return toActionState(error, "Could not delete that repo.");
  }

  revalidatePath("/repos");
  return { ok: true };
}
