import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });
const storageKey = 'unitracker-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(saved === 'light' || saved === 'dark' ? saved : system.matches ? 'dark' : 'light');
    const followSystem = (event: MediaQueryListEvent) => {
      if (saved !== 'light' && saved !== 'dark') setTheme(event.matches ? 'dark' : 'light');
    };
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      saved = event.newValue;
      setTheme(saved === 'light' || saved === 'dark' ? saved : system.matches ? 'dark' : 'light');
    };
    const chosen = () => { saved = 'chosen'; system.removeEventListener('change', followSystem); };
    system.addEventListener('change', followSystem);
    window.addEventListener('storage', sync);
    window.addEventListener('unitracker-theme-chosen', chosen);
    return () => {
      system.removeEventListener('change', followSystem);
      window.removeEventListener('storage', sync);
      window.removeEventListener('unitracker-theme-chosen', chosen);
    };
  }, []);

  useEffect(() => {
    if (theme === null) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Switching still works without storage. */ }
    window.dispatchEvent(new Event('unitracker-theme-chosen'));
  };

  return <ThemeContext.Provider value={{ theme: theme ?? 'light', toggle }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return <Button variant="ghost" size="icon" className="theme-toggle" aria-label={label} title={label} onClick={toggle}>{theme === 'dark' ? <Sun /> : <Moon />}</Button>;
}

export function ThemedToaster() {
  const { theme } = useContext(ThemeContext);
  return <Toaster theme={theme} />;
}