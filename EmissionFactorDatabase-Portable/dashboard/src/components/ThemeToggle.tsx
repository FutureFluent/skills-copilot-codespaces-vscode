type Theme = 'light' | 'dark';

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => {
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      onClick={onToggle}
    >
      <span aria-hidden="true">{isDark ? '🌞' : '🌙'}</span>
      <span className="theme-toggle__label">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};

export default ThemeToggle;
