"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthFormState } from "@/app/actions/auth";

import { FormError, SubmitButton } from "./form-ui";
import { CerebralMark } from "./logo";
import { Card, Field, Input } from "./ui";

interface AuthFormProps {
  mode: "login" | "register";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  redirectTo: string;
}

const COPY = {
  login: {
    title: "Sign in to Cerebral",
    // The one line anyone reads before deciding to go on, so it says what the
    // thing is rather than welcoming them to it.
    subtitle: "Projects, the tasks inside them, and how far along they are.",
    submit: "Sign in",
    switchPrompt: "Need an account?",
    switchHref: "/register",
    switchLabel: "Create one",
  },
  register: {
    title: "Create your account",
    subtitle: "Pick a name and a password. Nothing else is needed.",
    submit: "Create account",
    switchPrompt: "Already registered?",
    switchHref: "/login",
    switchLabel: "Sign in",
  },
} as const;

/**
 * The signed-out screen: a single 400px column centred on the app background,
 * the way the library frames its onboarding steps. Fields are the standard
 * input; the action is a full-width large primary button.
 */
export function AuthForm({ mode, action, redirectTo }: AuthFormProps) {
  const [state, formAction] = useActionState(action, {});
  const copy = COPY[mode];

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-[20px] py-[48px]">
      <div className="flex w-full max-w-[400px] flex-col gap-[20px]">
        <div className="flex flex-col items-center gap-[10px] text-center">
          {/* The heading below already says "Cerebral", so the mark is
              decoration here and stays out of the accessibility tree. */}
          <CerebralMark size={36} className="text-fg" />
          <h1 className="text-title3 font-medium text-fg">{copy.title}</h1>
          <p className="max-w-[320px] text-small text-fg-subtle">{copy.subtitle}</p>
        </div>

        {/* The panel is what gives the fields somewhere to sit. Floating them
            straight on the app ground left the only screen a new account ever
            sees with nothing holding it together. */}
        <Card className="p-[24px]">
          <form action={formAction} className="flex flex-col gap-[16px]">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <FormError message={state.error} />

            <Field label="Name" htmlFor="name" error={state.fieldErrors?.name}>
              <Input
                id="name"
                name="name"
                autoComplete="username"
                required
                placeholder="Your name"
                // The caret starts where the typing does.
                autoFocus
                invalid={Boolean(state.fieldErrors?.name)}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                placeholder="••••••••"
                invalid={Boolean(state.fieldErrors?.password)}
              />
            </Field>

            <SubmitButton size="large" className="mt-[4px] w-full">
              {copy.submit}
            </SubmitButton>
          </form>
        </Card>

        <p className="text-center text-small text-fg-subtle">
          {copy.switchPrompt}{" "}
          <Link
            href={copy.switchHref}
            className="text-fg no-underline transition-colors duration-100 hover:text-brand-ring"
          >
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
