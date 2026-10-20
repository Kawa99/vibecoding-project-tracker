export const TYPE_STYLES = {
  feature: { label: 'Feature', text: 'text-type-feature', border: 'border-l-type-feature' },
  bug: { label: 'Bug', text: 'text-type-bug', border: 'border-l-type-bug' },
};

export default function TaskType({ type }) {
  const style = TYPE_STYLES[type];
  if (!style) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16"
        className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="8" cy="8" r="6" />
        {type === 'feature' ? <path d="M8 5v6M5 8h6" /> : (
          <>
            <path d="M8 4.5v4" />
            <circle cx="8" cy="11" r="0.75" fill="currentColor" stroke="none" />
          </>
        )}
      </svg>
      {style.label}
    </span>
  );
}
