"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/server";
import { API_KEY_SCOPES, type ApiKeyScope } from "@/lib/api/types";

import { optionalText, toActionState, type ActionState } from "./action-state";

/**
 * Issuing credentials for observer bots.
 *
 * The secret comes back exactly once, from this one call, and is not
 * recoverable from any later request. So the action hands it straight to the
 * form's state and the form is responsible for putting it in front of someone
 * before it is gone.
 */
export interface CreateKeyState extends ActionState {
  /** The secret. Present only on the render immediately after creation. */
  secret?: string;
  keyName?: string;
  prefix?: string;
}

export async function createApiKeyAction(
  _prevState: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  // Only scopes the API actually defines; anything else is dropped rather than
  // sent on to be rejected.
  const scopes = formData
    .getAll("scopes")
    .map(String)
    .filter((scope): scope is ApiKeyScope =>
      (API_KEY_SCOPES as readonly string[]).includes(scope),
    );

  if (scopes.length === 0) {
    return { fieldErrors: { scopes: "A key with no scopes could not do anything." } };
  }

  const expiresAt = optionalText(formData, "expires_at");

  try {
    const created = await api.apiKeys.create({
      name: String(formData.get("name") ?? "").trim(),
      agent_id: optionalText(formData, "agent_id") ?? null,
      scopes,
      // A date input gives a day; the API wants an instant. End of that day in
      // the viewer's own zone is the reading that matches "expires on the 9th".
      expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    });

    revalidatePath("/api-keys");
    return {
      ok: true,
      secret: created.key,
      keyName: created.api_key.name,
      prefix: created.api_key.prefix,
    };
  } catch (error) {
    return toActionState(error, "Could not issue that key.");
  }
}

/**
 * Revoke, not delete: the row survives with `revoked_at` set, so a key that
 * appears in an audit trail can still be named long after it stopped working.
 */
export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const keyId = String(formData.get("key_id") ?? "");
  if (!keyId) return;

  await api.apiKeys.revoke(keyId);
  revalidatePath("/api-keys");
}
