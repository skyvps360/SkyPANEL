import React, { useEffect, useState } from "react";

// Utility to get/set theme in localStorage
const getStoredTheme = () => {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("theme") || "light";
};

const setStoredTheme = (theme: "light" | "dark") => {
  localStorage.setItem("theme", theme);
};

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => getStoredTheme() as "light" | "dark");

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    setStoredTheme(theme);
  }, [theme]);

  // Sync with system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!localStorage.getItem("theme")) {
        setTheme(mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="rounded p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
      type="button"
    >
      {theme === "dark" ? (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        </svg>
      ) : (
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 7.07l-1.41-1.41M6.34 6.34L4.93 4.93m12.02 0l-1.41 1.41M6.34 17.66l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
