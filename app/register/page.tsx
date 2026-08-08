import { AuthForm } from "@/app/_components/auth-form";
import { registerAction } from "@/app/actions/auth";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const safeRedirect = redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/";

  return <AuthForm mode="register" action={registerAction} redirectTo={safeRedirect} />;
}
