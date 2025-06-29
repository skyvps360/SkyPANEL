import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define NodeJS.Timeout type if not available
type TimeoutRef = ReturnType<typeof setTimeout>;

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
  const [showReloadPopup, setShowReloadPopup] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const reloadTimeoutRef = React.useRef<TimeoutRef | null>(null);

  // Check if we're in admin area
  const isAdminArea = location.startsWith('/admin');

  useEffect(() => {
    const root = window.document.documentElement;

    if (isAdminArea) {
      // Apply admin theme
      root.classList.remove("light", "dark");

      if (adminTheme === "dark") {
        root.classList.add("dark");
        // Applied dark theme class to admin
      } else {
        root.classList.add("light");
        // Applied light theme class to admin
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
      // Applied light theme to frontend

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
      // Initialized admin theme
    } else {
      // If we're not in admin area, ensure frontend uses light theme
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add("light");
      // Initialized frontend theme: light
    }
  }, [isAdminArea]);

  const toggleTheme = () => {
    if (isAdminArea) {
      const newTheme = adminTheme === "light" ? "dark" : "light";
      setShowReloadPopup(true);
      setCountdown(5);
      reloadTimeoutRef.current = setTimeout(() => {
        setStoredAdminTheme(newTheme);
        window.location.reload();
      }, 5000);
      return;
    }
    // Frontend areas always stay light, so no toggle needed
  };

  // Cancel handler
  const handleCancel = () => {
    setShowReloadPopup(false);
    setCountdown(5);
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!showReloadPopup) return;
    setCountdown(5);
    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 1;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [showReloadPopup]);

  return (
    <>
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        className="rounded p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
        type="button"
        disabled={showReloadPopup}
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
      {showReloadPopup && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
        >
          <Card className="w-full max-w-md border shadow-lg bg-background text-foreground animate-in zoom-in-95">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <RotateCcw className="w-12 h-12 mb-4 text-primary animate-spin" />
              <div className="text-2xl font-semibold mb-2">Theme is changing...</div>
              <div className="text-base text-muted-foreground mb-6">Refreshing page in {countdown} second{countdown !== 1 ? 's' : ''}</div>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default ThemeToggle;
