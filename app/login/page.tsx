import { AuthForm } from "@/app/_components/auth-form";
import { loginAction } from "@/app/actions/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  // `searchParams` is a promise in this version of Next.js.
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  // Only accept internal paths — an absolute URL here would be an open
  // redirect. `/` is excluded too: that is the marketing page, and signing in
  // should land you in the workspace.
  const safeRedirect =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//") && redirectTo !== "/"
      ? redirectTo
      : "/projects";

  return <AuthForm mode="login" action={loginAction} redirectTo={safeRedirect} />;
}
