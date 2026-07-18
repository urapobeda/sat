import { Lightbulb, ListChecks, MessageCircleQuestion, Sparkles } from "lucide-react";
import type { AITutorAction } from "@/lib/aiTutor";

type TutorQuickAction = {
  action: AITutorAction;
  label: string;
  message: string;
};

const beforeSubmitActions: TutorQuickAction[] = [
  {
    action: "hint",
    label: "Give me a hint",
    message: "Give me one hint without revealing the answer."
  },
  {
    action: "next-step",
    label: "Show the next step",
    message: "Show me the next step without solving everything."
  },
  {
    action: "explain",
    label: "Explain this concept",
    message: "Explain the concept I need for this question without revealing the answer."
  }
];

const afterSubmitActions: TutorQuickAction[] = [
  {
    action: "explain-mistake",
    label: "Explain my mistake",
    message: "Explain my mistake and how to avoid it next time."
  },
  {
    action: "explain",
    label: "Show full solution",
    message: "Show the full solution step by step."
  },
  {
    action: "explain",
    label: "Explain every answer choice",
    message: "Explain why each answer choice is correct or incorrect."
  }
];

type AITutorActionsProps = {
  disabled: boolean;
  hasSubmitted: boolean;
  onAction: (action: AITutorAction, message: string) => void;
};

export function AITutorActions({
  disabled,
  hasSubmitted,
  onAction
}: AITutorActionsProps) {
  const actions = hasSubmitted ? afterSubmitActions : beforeSubmitActions;

  return (
    <div className="grid gap-2">
      {actions.map((item, index) => (
        <button
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-black text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          disabled={disabled}
          key={item.label}
          onClick={() => onAction(item.action, item.message)}
          type="button"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            {index === 0 ? (
              <Lightbulb size={17} />
            ) : index === 1 ? (
              <ListChecks size={17} />
            ) : hasSubmitted ? (
              <MessageCircleQuestion size={17} />
            ) : (
              <Sparkles size={17} />
            )}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
