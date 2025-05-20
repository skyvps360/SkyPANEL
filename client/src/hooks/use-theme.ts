import { useTheme as useNextTheme } from 'next-themes';

export function useTheme() {
  const { theme, setTheme } = useNextTheme();
  const isDark = theme === 'dark';
  
  return {
    theme,
    setTheme,
    isDark
  };
}