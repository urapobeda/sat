import { Laptop, Sparkles } from "lucide-react";
import { BearIcon } from "@/components/dashboard/BearIcon";

export function StudyBearIllustration() {
  return (
    <div className="pointer-events-none relative hidden h-32 w-60 shrink-0 items-end justify-center sm:flex">
      <Sparkles className="absolute -top-1 left-4 text-amber-400" size={18} />
      <Sparkles className="absolute right-8 top-2 text-violet-400" size={14} />

      <div className="absolute inset-0 rounded-full bg-violet-200/40 blur-2xl" />

      <div className="relative flex items-end gap-2">
        <div className="mb-1 flex flex-col items-center gap-0.5">
          <span className="h-2.5 w-14 rounded-sm bg-emerald-400" />
          <span className="h-2.5 w-16 rounded-sm bg-sky-400" />
          <span className="h-2.5 w-14 rounded-sm bg-violet-400" />
        </div>

        <span className="relative -mb-1 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-amber-100 text-amber-800 shadow-lg">
          <BearIcon size={56} />
        </span>

        <Laptop className="mb-1 text-slate-600" size={44} strokeWidth={1.5} />
      </div>
    </div>
  );
}
