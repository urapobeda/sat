import { Bot, UserRound } from "lucide-react";
import type { AITutorChatMessage } from "@/lib/aiTutor";

type AITutorMessageProps = {
  message: AITutorChatMessage;
};

export function AITutorMessage({ message }: AITutorMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={[
        "flex gap-3",
        isAssistant ? "items-start" : "flex-row-reverse items-start"
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
          isAssistant
            ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white"
            : "bg-slate-100 text-slate-700"
        ].join(" ")}
      >
        {isAssistant ? <Bot size={18} /> : <UserRound size={18} />}
      </div>

      <div
        className={[
          "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm",
          isAssistant
            ? "rounded-tl-lg border border-blue-100 bg-white text-slate-700"
            : "rounded-tr-lg bg-blue-600 text-white"
        ].join(" ")}
      >
        {message.response ? (
          <div>
            <p className="font-black text-slate-950">{message.response.title}</p>
            <p className="mt-2">{message.response.message}</p>
            {message.response.steps.length > 0 ? (
              <ol className="mt-3 space-y-2">
                {message.response.steps.map((step, index) => (
                  <li className="flex gap-2" key={`${message.id}-step-${step}`}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {message.response.followUpQuestion ? (
              <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 font-bold text-blue-800">
                {message.response.followUpQuestion}
              </p>
            ) : null}
          </div>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}
