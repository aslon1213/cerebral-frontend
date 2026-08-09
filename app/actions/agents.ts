"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";

import { optionalText, toActionState, type ActionState } from "./action-state";

export async function createAgentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await api.agents.create({
      name: String(formData.get("name") ?? "").trim(),
      description: optionalText(formData, "description") ?? null,
      default_model: optionalText(formData, "default_model") ?? null,
      is_active: true,
    });
  } catch (error) {
    // `duplicate_agent_name` is a 409 with a clear message of its own, so it
    // flows through as a form-level error without special casing.
    return toActionState(error, "Could not create that agent.");
  }

  revalidatePath("/agents");
  return { ok: true };
}

export async function updateAgentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const agentId = String(formData.get("agent_id") ?? "");
  if (!agentId) return { error: "Missing agent id." };

  try {
    await api.agents.update(agentId, {
      name: String(formData.get("name") ?? "").trim(),
      description: optionalText(formData, "description") ?? null,
      default_model: optionalText(formData, "default_model") ?? null,
    });
  } catch (error) {
    return toActionState(error, "Could not update that agent.");
  }

  revalidatePath("/agents");
  return { ok: true };
}

/**
 * Retiring an agent without deleting it.
 *
 * This is the move that `resource_in_use` forces: once a run references an
 * agent it cannot be deleted, so deactivating is how one is taken out of
 * service while the runs it produced keep pointing at something real.
 */
export async function setAgentActiveAction(formData: FormData): Promise<void> {
  const agentId = String(formData.get("agent_id") ?? "");
  if (!agentId) return;

  await api.agents.update(agentId, {
    is_active: formData.get("is_active") === "true",
  });
  revalidatePath("/agents");
}

export async function deleteAgentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const agentId = String(formData.get("agent_id") ?? "");
  if (!agentId) return { error: "Missing agent id." };

  try {
    await api.agents.remove(agentId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "resource_in_use") {
      return {
        error:
          "A recorded run was executed by this agent, so it cannot be deleted — deactivate it instead and the runs keep their attribution.",
      };
    }
    return toActionState(error, "Could not delete that agent.");
  }

  revalidatePath("/agents");
  return { ok: true };
}
