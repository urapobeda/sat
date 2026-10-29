import Link from "next/link";
import { Download, Play } from "lucide-react";

// Draft redesign — student/teacher workflow (homework, schedule, lesson
// recordings, teacher comments) is not implemented in Supabase yet, so all
// content below is placeholder data standing in for that future model.

const STUDENT_NAME = "Алия";

const sidebarNav = [
  { label: "Главная", href: "/dashboard", active: true },
  { label: "Домашние задания", href: "/dashboard", badge: "3", badgeTone: "amber" as const },
  { label: "Банк вопросов", href: "/question-bank" },
  { label: "Пробные тесты", href: "/tests" },
  { label: "Тетрадь ошибок", href: "/question-bank/practice", badge: "17", badgeTone: "slate" as const },
  { label: "Расписание", href: "/dashboard" },
  { label: "Записи уроков", href: "/dashboard" },
  { label: "Материалы", href: "/dashboard" }
];

const topStats = [
  { label: "SAT · сб, 7 нояб", value: "9 дней" },
  { label: "Последний пробник", value: "1330" },
  { label: "Цель", value: "1450" }
];

type HomeworkRow = {
  title: string;
  meta: string;
  due: string;
  dueTone: "today" | "default" | "done";
  progress?: { done: number; total: number };
  percent?: number;
  action: { label: string; href: string; variant: "primary" | "outline" | "link" };
};

const homeworkRows: HomeworkRow[] = [
  {
    title: "Unit 9 · Nonlinear functions",
    meta: "Math · 22 вопроса · без лимита времени",
    due: "Сегодня, 23:59",
    dueTone: "today",
    progress: { done: 14, total: 22 },
    action: { label: "Продолжить", href: "/question-bank/practice", variant: "primary" }
  },
  {
    title: "Article Annotation III",
    meta: "Reading & Writing · текст + 12 вопросов",
    due: "Пт, 30 окт",
    dueTone: "default",
    action: { label: "Начать", href: "/question-bank?section=reading-writing", variant: "outline" }
  },
  {
    title: "Mini test #6 · Module 2 (hard)",
    meta: "Тест · 27 вопросов · 35 минут · 1 попытка",
    due: "Вс, 1 нояб",
    dueTone: "default",
    action: { label: "Начать", href: "/tests/start", variant: "outline" }
  },
  {
    title: "Unit 8 · Linear equations",
    meta: "Сдано 28 окт",
    due: "Ср, 28 окт",
    dueTone: "done",
    percent: 90,
    progress: { done: 18, total: 20 },
    action: { label: "Разбор ошибок", href: "/progress", variant: "link" }
  },
  {
    title: "Words in Context #4",
    meta: "Проверено · есть комментарий преподавателя",
    due: "Пн, 26 окт",
    dueTone: "done",
    percent: 92,
    progress: { done: 11, total: 12 },
    action: { label: "Комментарий", href: "/progress", variant: "link" }
  }
];

const practiceTests = [
  { label: "#4 · 26 окт", breakdown: "R&W 660 · M 670", score: 1330, delta: "+60" },
  { label: "#3 · 12 окт", breakdown: "R&W 640 · M 630", score: 1270, delta: "+50" },
  { label: "#2 · 28 сен", breakdown: "R&W 620 · M 600", score: 1220, delta: "+70" },
  { label: "#1 · 14 сен", breakdown: "R&W 590 · M 560", score: 1150, delta: null }
];

const weakTopics = [
  { topic: "Boundaries", accuracy: 52 },
  { topic: "Nonlinear functions", accuracy: 61 },
  { topic: "Inferences", accuracy: 64 },
  { topic: "Circles", accuracy: 67 }
];

function getGreeting(hour: number) {
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function getDateLine(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  })
    .format(date)
    .toUpperCase();
}

function getAccuracyColor(percent: number) {
  if (percent < 55) return "bg-rose-500";
  if (percent < 65) return "bg-orange-500";
  if (percent < 75) return "bg-amber-500";
  return "bg-emerald-500";
}

export function DashboardPage() {
  const now = new Date();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center justify-between bg-slate-950 px-5 py-3 text-white sm:px-7">
        <span className="text-sm font-semibold text-slate-300">
          Ученик — главная
        </span>
        <div className="flex items-center gap-3">
          <button
            aria-label="Скачать отчёт"
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            type="button"
          >
            <Download size={18} />
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-bold transition hover:bg-white/10"
            type="button"
          >
            <Play size={14} />
            PLAY
          </button>
        </div>
      </div>

      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
          <div className="px-1">
            <p className="text-lg font-black text-slate-950">sat/hub</p>
            <p className="text-xs font-semibold text-slate-400">
              SAT · IELTS · English
            </p>
          </div>

          <nav className="mt-6 space-y-1">
            {sidebarNav.map((item) => (
              <Link
                className={[
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition",
                  item.active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                ].join(" ")}
                href={item.href}
                key={item.label}
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-black",
                      item.badgeTone === "amber"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    ].join(" ")}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1 p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <main className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black tracking-wide text-slate-400">
                    {getDateLine(now)}
                  </p>
                  <h1 className="mt-1 text-2xl font-black text-slate-950">
                    {getGreeting(now.getHours())}, {STUDENT_NAME}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Одно задание нужно сдать сегодня до 23:59.
                  </p>
                </div>

                <div className="flex gap-3">
                  {topStats.map((stat) => (
                    <div
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm"
                      key={stat.label}
                    >
                      <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {stat.label}
                      </p>
                      <p className="mt-0.5 text-lg font-black text-slate-950">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-950">
                    Домашние задания
                  </h2>
                  <Link
                    className="text-sm font-bold text-blue-600 hover:underline"
                    href="/dashboard"
                  >
                    Все задания
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                        <th className="pb-2 pr-3 font-bold">Задание</th>
                        <th className="pb-2 pr-3 font-bold">Срок</th>
                        <th className="pb-2 pr-3 font-bold">Прогресс</th>
                        <th className="pb-2 font-bold">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {homeworkRows.map((row) => (
                        <tr key={row.title}>
                          <td className="py-3 pr-3 align-top">
                            <p className="font-bold text-slate-900">{row.title}</p>
                            <p className="text-xs text-slate-500">{row.meta}</p>
                          </td>
                          <td className="py-3 pr-3 align-top">
                            {row.dueTone === "today" ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                {row.due}
                              </span>
                            ) : (
                              <span className="text-slate-600">{row.due}</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 align-top">
                            {row.progress ? (
                              <div className="w-32">
                                <p className="text-xs font-semibold text-slate-700">
                                  {row.progress.done} / {row.progress.total}
                                  {row.percent ? ` · ${row.percent}%` : ""}
                                </p>
                                {row.dueTone !== "done" ? (
                                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-blue-600"
                                      style={{
                                        width: `${Math.round(
                                          (row.progress.done / row.progress.total) * 100
                                        )}%`
                                      }}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-400">Не начато</span>
                            )}
                          </td>
                          <td className="py-3 align-top">
                            {row.action.variant === "primary" ? (
                              <Link
                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                                href={row.action.href}
                              >
                                {row.action.label}
                              </Link>
                            ) : row.action.variant === "outline" ? (
                              <Link
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50"
                                href={row.action.href}
                              >
                                {row.action.label}
                              </Link>
                            ) : (
                              <Link
                                className="text-xs font-bold text-blue-600 hover:underline"
                                href={row.action.href}
                              >
                                {row.action.label}
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Тетрадь ошибок
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    17 вопросов ждут повтора. Больше всего ошибок в темах
                    Boundaries (6) и Nonlinear functions (4).
                  </p>
                </div>
                <Link
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                  href="/question-bank/practice"
                >
                  Повторить 10 вопросов
                </Link>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-base font-black text-slate-950">
                  От преподавателя
                </h2>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-bold text-slate-900">
                      Даньяр · Words in Context #4
                    </p>
                    <p className="text-xs text-slate-400">26 окт, 21:10</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Хорошо, Алия. В 7-м вопросе ты выбрала слово по общему
                    смыслу текста, а нужно смотреть на контраст после
                    «however». Пересмотри разбор и сделай 5 похожих в банке
                    вопросов.
                  </p>
                </div>
              </section>
            </main>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Следующий урок
                </p>
                <p className="mt-2 text-base font-black text-slate-950">
                  Пн, 2 нояб · 18:00
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  90 минут · Группа SAT · Ноябрь
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Inferences и Command of Evidence: разбор пробника #4
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                    type="button"
                  >
                    Ссылка на урок
                  </button>
                  <button
                    className="text-left text-xs font-bold text-blue-600 hover:underline"
                    type="button"
                  >
                    Запись от 28 окт
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-950">
                    Пробные тесты
                  </h2>
                  <p className="text-xs font-semibold text-slate-400">
                    шкала 1000–1600
                  </p>
                </div>

                <ul className="mt-3 divide-y divide-slate-100">
                  {practiceTests.map((test) => (
                    <li className="flex items-center justify-between py-2.5" key={test.label}>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {test.label}
                        </p>
                        <p className="text-xs text-slate-500">{test.breakdown}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-950">
                          {test.score}
                        </p>
                        {test.delta ? (
                          <p className="text-xs font-bold text-emerald-600">
                            {test.delta}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: "92%" }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs font-semibold text-slate-500">
                    <span>Сейчас 1330</span>
                    <span>Цель 1450</span>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black text-slate-950">
                  Слабые темы
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Точность за последние 30 дней
                </p>

                <ul className="mt-4 space-y-3">
                  {weakTopics.map((item) => (
                    <li key={item.topic}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800">
                          {item.topic}
                        </span>
                        <span className="font-bold text-slate-500">
                          {item.accuracy}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${getAccuracyColor(item.accuracy)}`}
                          style={{ width: `${item.accuracy}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                <Link
                  className="mt-4 inline-block text-sm font-bold text-blue-600 hover:underline"
                  href="/question-bank"
                >
                  Тренировать слабые темы
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
