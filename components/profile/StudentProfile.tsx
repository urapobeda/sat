"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { groupRequest } from "@/lib/groupApi";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionStreak } from "@/lib/sessionStreak";
import { getCategoriesForSection } from "@/lib/questionBankStructure";
import type { ProfileData } from "@/lib/studentProfile";
import { daysUntilSAT } from "@/lib/studentProfile";

const date = (value: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );
const duration = (seconds: number) =>
  `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
function ScoreTrend({
  tests,
  field,
  label,
}: {
  tests: ProfileData["tests"];
  field: "score" | "rw" | "math";
  label: string;
}) {
  const points = [...tests].reverse().filter((t) => t[field] !== null);
  const min = field === "score" ? 400 : 200,
    range = field === "score" ? 1200 : 600;
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-medium">{label}</h3>
      {points.length > 1 ? (
        <svg
          viewBox="0 0 600 140"
          className="mt-2 h-32 w-full"
          role="img"
          aria-label={`${label} growth over completed tests`}
        >
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            points={points
              .map(
                (t, i) =>
                  `${15 + (i * 570) / (points.length - 1)},${125 - (110 * (t[field]! - min)) / range}`,
              )
              .join(" ")}
          />
        </svg>
      ) : (
        <p className="mt-2 text-xs text-slate-600">
          Not enough recorded scores for a chart.
        </p>
      )}
    </div>
  );
}
export function StudentProfile({ studentId }: { studentId?: string }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [calendar, setCalendar] = useState<{
    now: number;
    zone: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(
      () =>
        setCalendar({
          now: Date.now(),
          zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      0,
    );
    const controller = new AbortController();
    groupRequest<ProfileData>(
      `/api/profile${studentId ? "?studentId=" + studentId : ""}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((p) => {
        if (active) {
          setData(p);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [studentId, retry]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      let avatar = data.profile.avatar_url;
      const file = form.get("avatar");
      if (file instanceof File && file.size) {
        if (
          file.size > 2097152 ||
          !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
            file.type,
          )
        )
          throw new Error("Choose a PNG, JPEG, WebP or GIF under 2 MB");
        const extension: Record<string, string> = {
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/webp": "webp",
          "image/gif": "gif",
        };
        avatar = `${data.profile.id}/${crypto.randomUUID()}.${extension[file.type]}`;
        const upload = await getSupabaseBrowserClient()
          .storage.from("avatars")
          .upload(avatar, file, { contentType: file.type });
        if (upload.error) throw new Error("Avatar upload failed");
      }
      await groupRequest("/api/profile", "PATCH", {
        full_name: String(form.get("full_name")),
        target_score: form.get("target_score")
          ? Number(form.get("target_score"))
          : null,
        sat_date: form.get("sat_date") || null,
        school: String(form.get("school")),
        grade: String(form.get("grade")),
        telegram: String(form.get("telegram")),
        about: String(form.get("about")),
        avatar_url: avatar,
      });
      setEditing(false);
      window.dispatchEvent(new Event("sat-profile-updated"));
      setRetry((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }
  async function saveNote() {
    if (!studentId || !note.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await groupRequest("/api/teacher/students", "POST", {
        studentId,
        body: note.trim(),
      });
      setNote("");
      setRetry((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }
  if (!data)
    return (
      <section className="hub-card p-6">
        <h1 className="text-2xl font-bold">Student profile</h1>
        {error ? (
          <p role="alert">
            {error}{" "}
            <Link className="hub-text-link" href="/auth">
              Sign in
            </Link>{" "}
            <button
              className="cursor-pointer underline"
              onClick={() => setRetry((n) => n + 1)}
            >
              Retry
            </button>
          </p>
        ) : (
          <p role="status">Loading profile…</p>
        )}
      </section>
    );
  const p = data.profile;
  const latest = data.tests.find((t) => t.score !== null)?.score ?? null;
  const days =
    p.sat_date && calendar
      ? daysUntilSAT(p.sat_date, calendar.now, calendar.zone)
      : null;
  const totalSeconds = data.timing.reduce((s, t) => s + t.seconds, 0);
  const weekSeconds = data.timing
    .filter(
      (t) => calendar && Date.parse(t.date) >= calendar.now - 7 * 86400000,
    )
    .reduce((s, t) => s + t.seconds, 0);
  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-900" role="alert">
          {error}
        </p>
      ) : null}
      <header className="hub-card flex flex-wrap items-center gap-4 p-6">
        {data.avatar /* eslint-disable-next-line @next/next/no-img-element -- signed private avatar */ ? (
          <img
            className="size-20 rounded-full object-cover"
            src={data.avatar}
            alt="Student avatar"
          />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-blue-100 text-3xl text-blue-800">
            {(p.full_name ?? "S").slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-3xl font-bold">
            {p.full_name ?? "Student"}
          </h1>
          <p className="text-sm text-slate-600">
            {data.groups
              .map((g) => `${g.name} · ${g.teacher_name}`)
              .join(" / ") || "No group yet"}
          </p>
          <p className="mt-1 text-sm">
            SAT: {p.sat_date ?? "Not set"}{" "}
            {days === null
              ? ""
              : days >= 0
                ? `· ${days} days remaining`
                : "· Update your planned date"}
          </p>
        </div>
        {!studentId ? (
          <>
            <button
              className="hub-primary cursor-pointer"
              onClick={() => setEditing(!editing)}
              type="button"
            >
              {editing ? "Close" : "Edit profile"}
            </button>
            <Link className="hub-text-link" href="/progress">
              Full progress
            </Link>
          </>
        ) : null}
      </header>
      {editing && !studentId ? (
        <form
          className="hub-card grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={save}
        >
          {[
            ["full_name", "Name", p.full_name, "text", 120],
            [
              "target_score",
              "Target score",
              p.target_score,
              "number",
              undefined,
            ],
            ["sat_date", "SAT date", p.sat_date, "date", undefined],
            ["school", "School", p.school, "text", 200],
            ["grade", "Grade", p.grade, "text", 40],
            ["telegram", "Telegram", p.telegram, "text", 100],
          ].map(([name, label, value, type, max]) => (
            <label key={String(name)} className="flex flex-col gap-1 text-sm">
              {label}
              <input
                className="min-h-11 rounded-xl border border-slate-300 bg-transparent px-3"
                name={String(name)}
                defaultValue={value ?? ""}
                type={String(type)}
                maxLength={typeof max === "number" ? max : undefined}
                required={name === "full_name"}
                min={name === "target_score" ? 400 : undefined}
                max={name === "target_score" ? 1600 : undefined}
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            About
            <textarea
              className="rounded-xl border border-slate-300 bg-transparent p-3"
              name="about"
              maxLength={2000}
              defaultValue={p.about ?? ""}
            />
          </label>
          <label className="text-sm">
            Avatar · max 2 MB
            <input
              className="mt-1 block w-full"
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp,image/gif"
            />
          </label>
          <button
            className="hub-primary cursor-pointer justify-center disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      ) : null}
      {p.school || p.grade || p.telegram || p.about ? (
        <section className="hub-card p-5">
          <p>{[p.school, p.grade, p.telegram].filter(Boolean).join(" · ")}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {p.about}
          </p>
        </section>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Latest SAT estimate", latest ?? "—"],
          ["R&W estimate", data.tests.find((t) => t.rw !== null)?.rw ?? "—"],
          [
            "Math estimate",
            data.tests.find((t) => t.math !== null)?.math ?? "—",
          ],
          ["Target", p.target_score ?? "—"],
          [
            "Gap to target",
            latest !== null && p.target_score !== null
              ? Math.max(0, p.target_score - latest)
              : "—",
          ],
          ["Question Bank questions answered", data.answered],
          ["Accuracy", data.accuracy === null ? "—" : `${data.accuracy}%`],
          [
            "Completed-session streak",
            calendar
              ? `${getSessionStreak(data.activity, calendar.now, calendar.zone)} days`
              : "—",
          ],
        ].map(([label, value]) => (
          <div className="hub-card p-5" key={label}>
            <p className="text-sm text-slate-600">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>
      <section className="hub-card p-5">
        <h2 className="text-lg font-semibold">Score history</h2>
        <p className="text-xs text-slate-600">
          Unofficial estimates. Section scores appear only when recorded by the
          test.
        </p>
        <div className="mt-3 grid gap-4">
          <ScoreTrend
            tests={data.tests}
            field="score"
            label="Total SAT estimate"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ScoreTrend
              tests={data.tests}
              field="rw"
              label="Reading & Writing estimate"
            />
            <ScoreTrend tests={data.tests} field="math" label="Math estimate" />
          </div>
        </div>
        {data.tests.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Test</th>
                  <th>Total</th>
                  <th>R&W</th>
                  <th>Math</th>
                </tr>
              </thead>
              <tbody>
                {data.tests.map((t) => (
                  <tr className="border-t border-slate-200" key={t.id}>
                    <td className="py-2">{date(t.date)}</td>
                    <td>{t.label}</td>
                    <td>{t.score ?? "—"}</td>
                    <td>{t.rw ?? "—"}</td>
                    <td>{t.math ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">No completed tests yet.</p>
        )}
      </section>
      <section className="hub-card p-5">
        <h2 className="text-lg font-semibold">Recorded practice time</h2>
        <p>
          Last 7 days: {duration(weekSeconds)} · Total: {duration(totalSeconds)}
        </p>
        <p className="text-xs text-slate-600">
          Uses saved correct-answer time; older answers without timing are
          excluded.
        </p>
      </section>
      <section className="hub-card p-5">
        <h2 className="text-lg font-semibold">Top skills to practise</h2>
        <div className="mt-3 space-y-2">
          {data.skills
            .filter((s) => s.total > 0 && s.accuracy < 100)
            .slice(0, 3)
            .map((s) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2"
                key={s.section + s.name}
              >
                <p>
                  {s.name} · {s.accuracy}%
                </p>
                {!studentId ? (
                  <Link
                    className="hub-primary"
                    href={`/question-bank/practice?section=${s.section}&topics=${encodeURIComponent(s.name)}`}
                  >
                    Practice
                  </Link>
                ) : null}
              </div>
            ))}
        </div>
      </section>
      <section className="hub-card p-5">
        <h2 className="text-lg font-semibold">SAT skill accuracy</h2>
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          {(["reading-writing", "math"] as const).map((section) => (
            <div key={section}>
              <h3 className="font-semibold">
                {section === "math" ? "Math" : "Reading & Writing"}
              </h3>
              {getCategoriesForSection(section)
                .flatMap((c) => c.subtopics)
                .map((skill) => {
                  const s = data.skills.find(
                    (s) => s.section === section && s.name === skill.title,
                  );
                  return (
                    <p
                      className="mt-2 flex justify-between gap-3 text-sm"
                      key={skill.title}
                    >
                      <span>{skill.title}</span>
                      <span className="shrink-0">
                        {s ? `${s.accuracy}% (${s.correct}/${s.total})` : "—"}
                      </span>
                    </p>
                  );
                })}
            </div>
          ))}
        </div>
      </section>
      <section className="hub-card p-5">
        <h2 className="text-lg font-semibold">Homework</h2>
        <p>
          On time: {data.homework.onTime} · Late: {data.homework.late} · Not
          submitted: {data.homework.missing}
        </p>
        <p>
          Average:{" "}
          {data.homework.average === null ? "—" : data.homework.average + "%"}
        </p>
      </section>
      <section className="hub-card p-5">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <ul className="divide-y divide-slate-200">
          {data.activity.slice(0, 15).map((a) => (
            <li
              className="flex flex-wrap justify-between gap-2 py-2 text-sm"
              key={a.id}
            >
              <span>
                {date(a.date)} · {a.label}
              </span>
              <span>{a.result}</span>
            </li>
          ))}
        </ul>
      </section>
      {studentId ? (
        <section className="hub-card p-5">
          <h2 className="text-lg font-semibold">Private teacher notes</h2>
          <p className="text-xs text-slate-600">
            The student cannot see these notes.
          </p>
          <label className="mt-3 block text-sm">
            New note
            <textarea
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-transparent p-3"
              maxLength={5000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button
            className="hub-primary mt-2 cursor-pointer disabled:opacity-50"
            disabled={saving || !note.trim()}
            onClick={() => void saveNote()}
            type="button"
          >
            Save note
          </button>
          <ul>
            {data.notes.map((n) => (
              <li
                className="mt-3 whitespace-pre-wrap border-t border-slate-200 pt-2 text-sm"
                key={n.id}
              >
                <span className="block text-xs text-slate-600">
                  {date(n.created_at)}
                </span>
                {n.body}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
