"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const storageKey = "sat-practice-theme";
function subscribe(notify: () => void) {
  window.addEventListener("sat-theme-change", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("sat-theme-change", notify);
    window.removeEventListener("storage", notify);
  };
}
function isDarkTheme() { return document.documentElement.classList.contains("dark"); }

export function ThemeToggle({ menuItem = false }: { menuItem?: boolean }) {
  const isDark = useSyncExternalStore(subscribe, isDarkTheme, () => false);
  function toggle() {
    const theme = isDarkTheme() ? "light" : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try { window.localStorage.setItem(storageKey, theme); } catch { /* Theme still works without storage. */ }
    window.dispatchEvent(new Event("sat-theme-change"));
  }
  const Icon = isDark ? Moon : Sun;
  return (
    <button
      aria-label={menuItem ? `Тема: ${isDark ? "тёмная" : "светлая"}` : isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={menuItem
        ? "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/10"
        : "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-blue-100 bg-white text-slate-900 shadow-sm transition hover:bg-blue-50"}
      onClick={toggle} title={isDark ? "Включить светлую тему" : "Включить тёмную тему"} type="button"
    >
      <Icon aria-hidden="true" size={menuItem ? 17 : 18} />
      {menuItem ? <span>Тема: {isDark ? "тёмная" : "светлая"}</span> : null}
    </button>
  );
}
