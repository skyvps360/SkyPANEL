import { useEffect } from 'react';
import { useLocation } from 'wouter';

// Global theme manager hook that ensures proper theme application
export const useThemeManager = () => {
  const [location] = useLocation();
  
  useEffect(() => {
    const root = window.document.documentElement;
    const isAdminArea = location.startsWith('/admin');
    
    if (isAdminArea) {
      // Use stored admin theme (default to dark)
      const adminTheme = localStorage.getItem('admin-theme') || 'dark';
      root.classList.remove('light', 'dark');
      root.classList.add(adminTheme);
      console.log('Theme manager: Applied admin theme:', adminTheme);
    } else {
      // Force light theme for frontend
      root.classList.remove('light', 'dark');
      root.classList.add('light');
      console.log('Theme manager: Applied frontend light theme');
    }
    
    // Force repaint
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
  }, [location]);
};
