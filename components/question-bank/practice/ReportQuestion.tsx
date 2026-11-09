"use client";

import { Flag, X } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { QuestionReportReason } from "@/types/database";

const reasons: { value: QuestionReportReason; label: string }[] = [
  { value: "incorrect_answer", label: "Incorrect answer or explanation" },
  { value: "typo", label: "Typo or unclear wording" },
  { value: "display", label: "Image, formula or layout problem" },
  { value: "other", label: "Other" }
];

export function ReportQuestion({ questionId, isSignedIn }: { questionId: string; isSignedIn: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState<QuestionReportReason>("incorrect_answer");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "duplicate" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending" || !isSignedIn) return;
    setStatus("sending");
    try {
      const { error } = await getSupabaseBrowserClient().from("question_reports").insert({
        question_id: questionId, reason, details: details.trim()
      });
      if (error && error.code !== "23505") throw error;
      setStatus(error ? "duplicate" : "sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button aria-haspopup="dialog" aria-label="Report question" className="ml-auto grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => dialog.current?.showModal()} title="Report question" type="button">
        <Flag aria-hidden="true" size={17} />
      </button>
      <dialog aria-labelledby={titleId} className="hub-card m-auto w-[min(28rem,calc(100%-2rem))] p-5 text-slate-950 backdrop:bg-slate-950/60" ref={dialog}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="hub-section-title" id={titleId}>Report question</h2>
          <button aria-label="Close report" className="grid size-8 cursor-pointer place-items-center rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => dialog.current?.close()} type="button"><X aria-hidden="true" size={17} /></button>
        </div>
        {!isSignedIn ? (
          <p className="mt-3 text-sm text-slate-600"><Link className="hub-text-link font-semibold underline" href="/auth">Sign in</Link> to send a report.</p>
        ) : status === "sent" || status === "duplicate" ? (
          <p className="mt-3 text-sm text-slate-700" role="status">{status === "sent" ? "Report sent for review." : "You already reported this question."}</p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-semibold">
              Reason
              <select className="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-slate-950" onChange={(event) => setReason(event.target.value as QuestionReportReason)} value={reason}>
                {reasons.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Details (optional)
              <textarea className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-950" maxLength={1000} onChange={(event) => setDetails(event.target.value)} rows={3} value={details} />
            </label>
            {status === "error" ? <p className="text-sm text-rose-700" role="alert">Could not send your report. Please try again.</p> : null}
            <button className="hub-primary cursor-pointer disabled:cursor-wait disabled:opacity-60" disabled={status === "sending"} type="submit">{status === "sending" ? "Sending…" : "Send report"}</button>
          </form>
        )}
      </dialog>
    </>
  );
}
