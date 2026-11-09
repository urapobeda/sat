export function getAuthRedirectAction({
  mode, event, hasSession, hasCallbackPayload, redirectError
}: {
  mode: "callback" | "reset";
  event: string;
  hasSession: boolean;
  hasCallbackPayload: boolean;
  redirectError: string | null;
}) {
  if (mode === "reset" && event === "PASSWORD_RECOVERY" && hasSession && !redirectError) {
    return "recover";
  }
  if (mode === "callback" && event === "SIGNED_IN" && hasSession && hasCallbackPayload && !redirectError) {
    return "sign-in";
  }
  return event === "INITIAL_SESSION" ? "invalid" : "wait";
}
