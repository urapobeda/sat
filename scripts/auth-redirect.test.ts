import assert from "node:assert/strict";
import { getAuthRedirectAction } from "../lib/authRedirect.ts";

const callback = { mode: "callback" as const, hasSession: true, hasCallbackPayload: true, redirectError: null };
assert.equal(getAuthRedirectAction({ ...callback, event: "SIGNED_IN" }), "sign-in");
assert.equal(getAuthRedirectAction({ ...callback, event: "SIGNED_IN", hasCallbackPayload: false }), "wait");
assert.equal(getAuthRedirectAction({ ...callback, event: "INITIAL_SESSION", hasCallbackPayload: false }), "invalid");
assert.equal(getAuthRedirectAction({ ...callback, event: "SIGNED_IN", redirectError: "expired" }), "wait");
assert.equal(getAuthRedirectAction({ ...callback, event: "PASSWORD_RECOVERY" }), "wait");

const recovery = { ...callback, mode: "reset" as const };
assert.equal(getAuthRedirectAction({ ...recovery, event: "PASSWORD_RECOVERY" }), "recover");
assert.equal(getAuthRedirectAction({ ...recovery, event: "PASSWORD_RECOVERY", hasSession: false }), "wait");
assert.equal(getAuthRedirectAction({ ...recovery, event: "INITIAL_SESSION" }), "invalid");
assert.equal(getAuthRedirectAction({ ...recovery, event: "SIGNED_IN" }), "wait");

console.log("auth-redirect tests passed");
