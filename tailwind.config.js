/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries([
          'brand-primary', 'brand-accent', 'surface-page', 'surface-card', 'surface-column',
          'text-primary', 'text-muted', 'text-on-brand', 'border-subtle', 'control-border',
          'type-feature', 'type-bug', 'due-safe', 'due-safe-text', 'due-warning', 'due-warning-text',
          'due-overdue', 'due-overdue-text', 'due-neutral', 'due-neutral-text',
        ].map(name => [name, `rgb(var(--${name}) / <alpha-value>)`])),
        // Retain the starter names for existing task-type utilities.
        feature: 'rgb(var(--type-feature) / <alpha-value>)',
        bug: 'rgb(var(--type-bug) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
