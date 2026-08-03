import { AuthPage } from "@/components/auth/AuthPage";

type AuthPageRouteProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function Page({ searchParams }: AuthPageRouteProps) {
  const params = await searchParams;
  const initialMode = params?.mode === "signup" ? "signup" : "signin";

  return <AuthPage initialMode={initialMode} />;
}
