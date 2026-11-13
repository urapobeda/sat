import assert from "node:assert/strict";
import { getRoleAccessDecision, isUserRole } from "../lib/roles.ts";

for (const path of ["/teacher", "/teacher/groups", "/teacher/materials"]) {
  assert.deepEqual(getRoleAccessDecision("student", path), { type: "redirect", location: "/" });
  assert.deepEqual(getRoleAccessDecision(null, path), { type: "redirect", location: "/" });
  assert.equal(getRoleAccessDecision("teacher", path).type, "allow");
  assert.equal(getRoleAccessDecision("admin", path).type, "allow");
}
for (const path of ["/admin", "/admin/users"]) {
  assert.equal(getRoleAccessDecision("teacher", path).type, "redirect");
  assert.equal(getRoleAccessDecision("student", path).type, "redirect");
  assert.equal(getRoleAccessDecision("admin", path).type, "allow");
}
for (const role of [null, "student", "teacher"] as const) {
  assert.deepEqual(getRoleAccessDecision(role, "/api/admin/users"), { type: "forbidden", status: 403 });
}
assert.equal(getRoleAccessDecision("student", "/api/teacher/homework").type, "forbidden");
assert.equal(getRoleAccessDecision("teacher", "/api/teacher/homework").type, "allow");
for (const role of [null, "student", "teacher", "admin"] as const) {
  assert.equal(getRoleAccessDecision(role, "/question-bank").type, "allow");
  assert.equal(getRoleAccessDecision(role, "/tests/start").type, "allow");
}
assert.equal(getRoleAccessDecision("admin", "/api/admin/users").type, "allow");
assert.equal(isUserRole("owner"), false);
console.log("Role access tests passed (page redirects, API 403 and unchanged student routes)");
