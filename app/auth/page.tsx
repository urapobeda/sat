import { AuthPage } from "@/components/auth/AuthPage";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return <AuthPage initialMode={mode === "signup" || mode === "reset" || mode === "callback" ? mode : "signin"} />;
}
