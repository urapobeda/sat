import { SendHorizonal } from "lucide-react";
import { useState } from "react";

type AITutorInputProps = {
  disabled: boolean;
  onSend: (message: string) => void;
};

export function AITutorInput({ disabled, onSend }: AITutorInputProps) {
  const [message, setMessage] = useState("");
  const trimmedMessage = message.trim();

  function submitMessage() {
    if (!trimmedMessage || disabled) {
      return;
    }

    onSend(trimmedMessage);
    setMessage("");
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-2">
      <textarea
        className="min-h-20 w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100"
        disabled={disabled}
        maxLength={1200}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            submitMessage();
          }
        }}
        placeholder="Ask about this SAT question..."
        value={message}
      />
      <div className="mt-2 flex items-center justify-between gap-3 px-1">
        <span className="text-xs font-bold text-slate-500">
          {trimmedMessage.length} / 1200
        </span>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          disabled={!trimmedMessage || disabled}
          onClick={submitMessage}
          type="button"
        >
          Send
          <SendHorizonal size={16} />
        </button>
      </div>
    </div>
  );
}
