import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

// Global theme manager hook that ensures proper theme application
export const useThemeManager = () => {
  const [location] = useLocation();
  const lastAppliedTheme = useRef<string>('');

  useEffect(() => {
    const root = window.document.documentElement;
    const isAdminArea = location.startsWith('/admin');

    let targetTheme: string;
    if (isAdminArea) {
      // Use stored admin theme (default to dark)
      targetTheme = localStorage.getItem('admin-theme') || 'dark';
    } else {
      // Force light theme for frontend
      targetTheme = 'light';
    }

    // Only apply theme if it's different from the last applied theme
    const themeKey = `${isAdminArea ? 'admin' : 'frontend'}-${targetTheme}`;
    if (lastAppliedTheme.current === themeKey) {
      return;
    }

    // Debounce theme application to prevent rapid changes
    const timeoutId = setTimeout(() => {
      root.classList.remove('light', 'dark');
      root.classList.add(targetTheme);
      lastAppliedTheme.current = themeKey;

      if (isAdminArea) {
        console.log('Theme manager: Applied admin theme:', targetTheme);
      } else {
        console.log('Theme manager: Applied frontend light theme');
      }

      // Force repaint only when theme actually changes
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [location]);
};
