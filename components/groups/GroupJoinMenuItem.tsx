"use client";
import { useState, type FormEvent } from "react";
import { Users } from "lucide-react";
import { GROUP_CODE_PATTERN, normalizeGroupCode } from "@/lib/groups";
export function GroupJoinMenuItem() {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState("");
  function join(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeGroupCode(code);
    if (GROUP_CODE_PATTERN.test(normalized)) window.location.assign(`/join/${normalized}`);
  }
  return <div>
    <button type="button" aria-expanded={expanded} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/10" onClick={() => setExpanded(!expanded)}><Users size={17} aria-hidden="true" />Вступить в группу</button>
    {expanded ? <form onSubmit={join} className="space-y-2 px-3 pb-3 pt-1"><label className="block text-xs text-slate-300">Код группы<input autoComplete="off" maxLength={8} minLength={8} value={code} onChange={(event) => setCode(normalizeGroupCode(event.target.value))} required pattern="[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}" className="mt-1 min-h-10 w-full rounded-lg border border-white/20 bg-transparent px-2 text-sm uppercase text-white" placeholder="8 символов" /></label><button className="w-full cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50" type="submit" disabled={!GROUP_CODE_PATTERN.test(normalizeGroupCode(code))}>Вступить</button></form> : null}
  </div>;
}
