export type DesmosCalculator = {
  getState(): unknown;
  setState(state: unknown): void;
  observeEvent(event: "change", callback: () => void): void;
  unobserveEvent(event: "change"): void;
  resize(): void;
  destroy(): void;
};
export type DesmosAPI = {
  GraphingCalculator(element: HTMLElement, options: { language: string }): DesmosCalculator;
};
declare global {
  interface Window { Desmos?: DesmosAPI }
}

const DEMO_KEY = "dcb31709b452b1cf9dc26972add0fda6";
let loading: Promise<DesmosAPI> | undefined;
let warned = false;

/** Called only when the student opens a calculator. Concurrent panels share the SDK. */
export function loadDesmos(): Promise<DesmosAPI> {
  if (typeof window === "undefined") return Promise.reject(new Error("Desmos requires a browser"));
  if (window.Desmos) return Promise.resolve(window.Desmos);
  if (loading) return loading;
  const key = process.env.NEXT_PUBLIC_DESMOS_API_KEY?.trim() || DEMO_KEY;
  if (key === DEMO_KEY && !warned) {
    warned = true;
    console.warn("Desmos: используется демо-ключ. Для продакшена получите NEXT_PUBLIC_DESMOS_API_KEY на https://www.desmos.com/my-api");
  }
  loading = new Promise<DesmosAPI>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.desmos.com/api/v1.12/calculator.js?apiKey=${encodeURIComponent(key)}&lang=ru`;
    const timer = window.setTimeout(() => fail(), 20_000);
    function cleanup() {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
    }
    function fail() {
      cleanup();
      script.remove();
      loading = undefined;
      reject(new Error("Не удалось загрузить калькулятор. Проверьте соединение и повторите."));
    }
    script.onload = () => {
      if (!window.Desmos) { fail(); return; }
      cleanup();
      resolve(window.Desmos);
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

/** Owned by one attempt/lesson; never stored in localStorage or sent to the server. */
export function createDesmosStateStore() {
  const states = new Map<string, unknown>();
  return {
    get: (questionId: string) => states.get(questionId),
    set: (questionId: string, state: unknown) => { states.set(questionId, structuredClone(state)); },
    clear: () => states.clear()
  };
}
export type DesmosStateStore = ReturnType<typeof createDesmosStateStore>;

export function mountDesmos(api: DesmosAPI, element: HTMLElement, states: DesmosStateStore, questionId: string) {
  const calculator = api.GraphingCalculator(element, { language: "ru" });
  let destroyed = false;
  try {
    const state = states.get(questionId);
    if (state !== undefined) calculator.setState(state);
    calculator.observeEvent("change", () => {
      if (!destroyed) states.set(questionId, calculator.getState());
    });
  } catch (error) {
    calculator.destroy();
    throw error;
  }
  return {
    resize: () => { if (!destroyed) calculator.resize(); },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      try { states.set(questionId, calculator.getState()); }
      finally {
        try { calculator.unobserveEvent("change"); }
        finally { calculator.destroy(); }
      }
    }
  };
}
