/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#6D28D9',
        'brand-accent': '#5B21B6',
        'surface-page': '#FAFAF9',
        'surface-card': '#FFFFFF',
        'surface-column': '#F5F5F4',
        'text-primary': '#1C1917',
        'text-muted': '#57534E',
        'text-on-brand': '#FFFFFF',
        'border-subtle': '#E7E5E4',
        'control-border': '#78716C',
        'type-feature': '#0F766E',
        'type-bug': '#BE123C',
        'due-safe': '#F0FDFA',
        'due-safe-text': '#115E59',
        'due-warning': '#FFFBEB',
        'due-warning-text': '#92400E',
        'due-overdue': '#FFF1F2',
        'due-overdue-text': '#9F1239',
        'due-neutral': '#F5F5F4',
        'due-neutral-text': '#57534E',
        // Retain the starter names for existing task-type utilities.
        feature: '#0F766E',
        bug: '#BE123C',
      },
    },
  },
  plugins: [],
};
