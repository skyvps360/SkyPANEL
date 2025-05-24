import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";

// Utility to get/set admin theme in localStorage
const getStoredAdminTheme = () => {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("admin-theme") || "dark";
};

const setStoredAdminTheme = (theme: "light" | "dark") => {
  localStorage.setItem("admin-theme", theme);
};

export const ThemeToggle: React.FC = () => {
  const [location] = useLocation();
  const [adminTheme, setAdminTheme] = useState<"light" | "dark">(() => getStoredAdminTheme() as "light" | "dark");

  // Check if we're in admin area
  const isAdminArea = location.startsWith('/admin');

  useEffect(() => {
    const root = window.document.documentElement;

    if (isAdminArea) {
      // Apply admin theme
      root.classList.remove("light", "dark");

      if (adminTheme === "dark") {
        root.classList.add("dark");
        console.log("Applied dark theme class to admin");
      } else {
        root.classList.add("light");
        console.log("Applied light theme class to admin");
      }

      // Multiple methods to force immediate visual update
      root.style.display = 'none';
      root.offsetHeight; // Trigger reflow
      root.style.display = '';

      // Also force body repaint
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';

      // Force style recalculation
      window.getComputedStyle(root).getPropertyValue('color-scheme');

      // Force re-render of shadcn components
      setTimeout(() => {
        const elementsWithClasses = document.querySelectorAll('[class*="bg-"], [class*="border-"], [class*="text-"]');
        elementsWithClasses.forEach(el => {
          if (el instanceof HTMLElement) {
            const originalClasses = el.className;
            el.className = '';
            el.offsetHeight; // Force reflow
            el.className = originalClasses;
          }
        });
      }, 10);

    } else {
      // Force light theme for frontend areas
      root.classList.remove("light", "dark");
      root.classList.add("light");
      console.log("Applied light theme to frontend");

      // Multiple methods to force immediate visual update
      root.style.display = 'none';
      root.offsetHeight; // Trigger reflow
      root.style.display = '';

      // Also force body repaint
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';

      // Force style recalculation
      window.getComputedStyle(root).getPropertyValue('color-scheme');
    }
    setStoredAdminTheme(adminTheme);
  }, [adminTheme, isAdminArea]);

  // Initialize theme on component mount (only for admin)
  useEffect(() => {
    if (isAdminArea) {
      const root = window.document.documentElement;
      const storedTheme = getStoredAdminTheme();

      // Force apply the theme immediately
      root.classList.remove("light", "dark");
      root.classList.add(storedTheme);
      console.log("Initialized admin theme:", storedTheme);
    } else {
      // If we're not in admin area, ensure frontend uses light theme
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add("light");
      console.log("Initialized frontend theme: light");
    }
  }, [isAdminArea]);

  const toggleTheme = () => {
    if (isAdminArea) {
      const newTheme = adminTheme === "light" ? "dark" : "light";

      // Apply theme immediately to DOM
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);

      // Force immediate visual update with multiple methods
      root.style.display = 'none';
      root.offsetHeight; // Trigger reflow
      root.style.display = '';

      // Also force body repaint
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';

      // Force style recalculation on all elements
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (el instanceof HTMLElement) {
          window.getComputedStyle(el).getPropertyValue('background-color');
        }
      });

      // Force re-render of all shadcn components by temporarily removing and re-adding classes
      setTimeout(() => {
        const elementsWithClasses = document.querySelectorAll('[class*="bg-"], [class*="border-"], [class*="text-"]');
        elementsWithClasses.forEach(el => {
          if (el instanceof HTMLElement) {
            const originalClasses = el.className;
            el.className = '';
            el.offsetHeight; // Force reflow
            el.className = originalClasses;
          }
        });
      }, 10);

      // Trigger a custom event to force component re-renders
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));

      // Update state after DOM changes
      setAdminTheme(newTheme);
      console.log("Toggled admin theme to:", newTheme);
    }
    // Frontend areas always stay light, so no toggle needed
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="rounded p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
      type="button"
    >
      {adminTheme === "dark" ? (
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
