import { useTheme } from './theme.js';

export default function ThemeToggle() {
  const [theme, toggle, error] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <div>
      <button type="button" onClick={toggle} aria-label={`Switch to ${next} theme`}
        className="min-h-9 rounded-lg border border-control-border bg-surface-card px-4 py-2 text-sm font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
        <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'} </span>Switch to {next} theme
      </button>
      {error && <p role="alert" className="mt-2 max-w-xs text-sm text-due-overdue-text">{error}</p>}
    </div>
  );
}
