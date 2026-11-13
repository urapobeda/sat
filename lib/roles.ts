export type UserRole = "student" | "teacher" | "admin";
export function isUserRole(value: unknown): value is UserRole {
  return value === "student" || value === "teacher" || value === "admin";
}
export function canAccessArea(role: UserRole | null, area: "teacher" | "admin") {
  return role === "admin" || (area === "teacher" && role === "teacher");
}
export function getRoleAccessDecision(role: UserRole | null, pathname: string) {
  const match = pathname.match(/^\/(api\/)?(teacher|admin)(?:\/|$)/);
  if (!match || canAccessArea(role, match[2] as "teacher" | "admin")) return { type: "allow" } as const;
  return match[1] ? { type: "forbidden", status: 403 } as const : { type: "redirect", location: "/" } as const;
}
