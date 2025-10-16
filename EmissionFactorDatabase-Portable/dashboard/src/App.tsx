import { useEffect, useMemo, useState } from 'react';
import Dashboard from './components/Dashboard';
import ThemeToggle from './components/ThemeToggle';

const THEME_STORAGE_KEY = 'emission-dashboard-theme';

type Theme = 'light' | 'dark';

function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const App = () => {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const accentEmoji = useMemo(() => (theme === 'light' ? '🌍' : '🌌'), [theme]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="title-block">
          <h1>
            {accentEmoji} Emission Factor Intelligence
          </h1>
          <p>
            Explore category-level performance, country insights, and extremes across the
            emission factor catalogue. Use the filters to slice the data and spot outliers.
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <main>
        <Dashboard />
      </main>
    </div>
  );
};

export default App;
