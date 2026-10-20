# Vibecoding Project Tracker — Design

**Milestone:** M3 `design-done`. Design decisions and Tailwind tokens are complete; components are implemented in later milestones.
**Basis:** Current PRD core requirements, particularly FR-08–12, FR-15–17, FR-19–28 and NFR-02–05. Individual development still produces a tool with member ownership and handoff.

## 1. Mood / vibe

A quiet workbench: warm paper surfaces, crisp task details and a single violet action colour help a busy developer find the next useful step.

Design references (direction, not dependencies or exact layouts to copy):

- [Linear product interface](https://linear.app/features): reference for compact task hierarchy and restrained visual density; keep our lighter palette and simpler single-board scope.
- [GitHub Primer](https://primer.style/): reference for familiar developer-facing controls, clearly separated metadata and consistent component states.
- [Radix dialog example](https://www.radix-ui.com/primitives/docs/components/dialog): reference for a readable form over a dimmed board and explicit save/cancel controls; no Radix installation is required.

Avoid a marketing-style hero, glass panels, gradients, oversized empty space, neon-on-black dashboards and a different saturated background for every column. Information takes priority over decoration.

## 2. Colour palette

These are the default light-theme tokens in `tailwind.config.js`. Use complete utility names such as `bg-surface-card`, `text-text-muted`, `border-control-border` and `focus-visible:ring-brand-primary`. Apply `bg-surface-page text-text-primary font-sans` to the app shell when building M4; the starter page is not restyled by this milestone.

### Brand and surfaces

| Token | Hex | Use |
|---|---|---|
| `brand-primary` | `#6D28D9` | Primary actions, wordmark, links and focus ring |
| `brand-accent` | `#5B21B6` | Primary-action hover/active and link hover |
| `surface-page` | `#FAFAF9` | Warm page background |
| `surface-card` | `#FFFFFF` | Cards, fields and dialog |
| `surface-column` | `#F5F5F4` | Column wells and secondary controls |
| `text-primary` | `#1C1917` | Headings, card content and field values |
| `text-muted` | `#57534E` | Captions, dates, helper text and counts |
| `text-on-brand` | `#FFFFFF` | Text/icons on primary and hovered primary buttons |
| `border-subtle` | `#E7E5E4` | Decorative separators; never the only boundary of a control |
| `control-border` | `#78716C` | Input/select boundaries, secondary-button borders and empty status dots |

### Task type — M6

| Token | Hex | Use |
|---|---|---|
| `type-feature` | `#0F766E` | Feature accent stripe, icon and “Feature” text |
| `type-bug` | `#BE123C` | Bug accent stripe, icon and “Bug” text |

Cards keep their white surface. Type uses a narrow left stripe plus a labelled icon, while urgency uses a separate small badge. Never recolour the whole task solely by its type: an overdue feature must still be identifiable as a feature. Keep these type treatments consistent in the modal.

Use simple inline SVG symbols with text (plus-in-a-circle for Feature, exclamation-in-a-circle for Bug); decorative SVGs are hidden from assistive technology. No icon library or custom illustration system is needed. Existing `feature` and `bug` config names remain aliases of the corresponding type colours for starter compatibility.

### Deadline states — M8

| Background token | Hex | Foreground token | Hex | Meaning |
|---|---|---|---|---|
| `due-safe` | `#F0FDFA` | `due-safe-text` | `#115E59` | Calm, more than 48 hours away |
| `due-warning` | `#FFFBEB` | `due-warning-text` | `#92400E` | Warning through 48 hours: “Due today” or “Due soon” |
| `due-overdue` | `#FFF1F2` | `due-overdue-text` | `#9F1239` | At or past the deadline: “Overdue” |
| `due-neutral` | `#F5F5F4` | `due-neutral-text` | `#57534E` | “Done” or “No due date” |

Use both background and matching foreground tokens for urgency badges. Add text and a clock/check symbol so differences survive loss of colour perception. “Done” overrides deadline styling but does not erase the Feature/Bug marker.

Follow the PRD's current proposed policy, which supersedes the starter's ambiguous interval: local deadline is the next midnight after the due date; more than 0 through 24 hours is warning, more than 24 through 48 hours is also warning with “Due soon”, beyond 48 hours is calm, and at/after the deadline is overdue. Refresh at least once per minute while visible and on tab reactivation. These rules belong to M8 logic, not stored colour fields.

### Contrast and states

- Meet PRD NFR-03: at least 4.5:1 for normal text and 3:1 for large text and essential boundaries/focus indicators.
- Use `text-primary` and `text-muted` on page/card/column surfaces. Type text sits on the white card/dialog surface. Deadline text uses its matched badge background.
- Primary buttons use `text-on-brand` on `brand-primary` or `brand-accent`; links use violet on the light surfaces and are underlined.
- Controls use `control-border`, not `border-subtle`, as their identifying boundary. Use a 2px violet focus ring with a 2px white offset; focus must remain visible on primary buttons too.
- Error text uses `due-overdue-text` on white, linked to its field; an icon and message accompany any error border.
- Disabled controls retain readable text, explain unavailable actions, and use a disabled cursor without relying on reduced opacity.
- Default palette contrast is verified numerically. Later colour customization (FR-18, Planned) must validate contrast before saving and provide Restore defaults; it is not part of M3.

## 3. Typography

Use the installed Tailwind default font families; no downloaded fonts or new font dependency.

| Role | Font / utility | Reason |
|---|---|---|
| Headings | System sans-serif, `font-sans` | Familiar, crisp UI typography with no network delay |
| Body and controls | System sans-serif, `font-sans` | Matches headings and remains legible in dense task forms |
| Context textarea and technical metadata | System monospace, `font-mono` | Preserves alignment, indentation and code/log structure |

| Element | Size / line height | Weight |
|---|---|---|
| Page title / wordmark | 24 / 32px (`text-2xl`) | Semibold |
| Column and section heading | 16 / 24px (`text-base`) | Semibold, sentence case |
| Card title | 14 / 20px (`text-sm`) | Semibold |
| Body, inputs, buttons, context | 14 / 20px (`text-sm`) | Regular; buttons medium |
| Caption, dates, counts | 12 / 16px (`text-xs`) | Regular |

Use sentence case for scanability; keep the four exact PRD stage labels. Render long text with wrapping and `min-w-0`; preserve context whitespace and allow horizontal scrolling inside code-like content if needed. Never shrink important text to make a card fit.

## 4. Component principles

- **Layout:** A compact header, four equal deliverable slots, then four equal Kanban columns; use 24px page padding, 24px between major sections, 16px column gaps and 12px card gaps on a 4px spacing scale.
- **Cards:** White surface, 1px subtle border, 8px corners and 16px padding; show title, type, owner and urgency, with Copy Context as a separate real button rather than nesting it inside another button.
- **Buttons:** Solid violet primary, bordered neutral secondary and labelled rose delete; use 8px corners, at least 36px height, visible hover/focus states and explicit labels.
- **Modal:** Center a white, 8px-rounded dialog up to 640px wide over a `text-primary` backdrop at 50% opacity; limit height to the viewport with scrolling, keep Save task/Cancel reachable, trap focus and restore it on close.
- **Fields:** Persistent labels above controls, required markers for mandatory values, helper/error text below, and a monospace context textarea at least 160px tall; optional tool selection includes “No tool selected”.
- **Empty states:** Muted copy inside a dashed container with a contextual Add task action; columns and empty deliverable slots remain visible.
- **Ownership:** A small neutral initials badge exposes the full member name; Hand off to… is a labelled select, and a one-member list explains “Add another configured member to enable handoff.”
- **Anchors:** Four white slots with label, URL field, explicit Save link/Clear/Open actions, and outlined/filled dots accompanied by “No link”/“Link saved”; filled means recorded, not verified complete.
- **Movement:** Use the modal status dropdown for the baseline. Do not display grab cursors or drag handles before a functioning accessible drag feature is selected for M12.
- **Feedback:** Put concise success messages in a polite live region; announce validation/copy/storage failures accessibly, preserve drafts and show selectable briefing text when clipboard access fails.
- **Zoom and overflow:** At 1280 × 720 retain usable controls; at 200% zoom reflow deliverables and columns into fewer columns or provide contained scrolling, never clip the dialog footer or hide content.
- **Motion:** Only a brief toast fade up to 200ms; disable nonessential transitions for reduced-motion preferences. No animated card movement is necessary.

Copy Context inside the modal uses its visible draft and does not save it; the card button uses the saved task. Close, Cancel and Escape discard the draft as specified by the PRD. These interactions are for later implementation, not functionality completed by this document.

## 5. Voice / microcopy

Calm, direct and specific; avoid jokes, AI hype and messages that imply another human has been notified.

| Situation | Text |
|---|---|
| Add button | “Add task” (with a decorative plus) |
| Empty column | “No tasks in this stage yet.” |
| New-task / edit-dialog title | “New task” / “Edit task” |
| Save / cancel | “Save task” / “Cancel” |
| Copy button | “Copy Context” |
| Copy success | “Context copied. Paste it into your AI tool.” |
| Copy failure | “Couldn't copy. Select the text below and copy it manually.” |
| Confirm delete | “Delete this task? This cannot be undone.” |
| Delete confirmation / cancel | “Delete task” / “Keep task” |
| Handoff success | “Assigned to {name}.” |
| Unsaved context hint | “Context not saved yet.” |
| Context update hint | “Context updated {relativeTime}.” |
| Empty / filled anchor | “No link” / “Link saved” |
| Invalid URL | “Enter a full http:// or https:// URL.” |
| Storage failure | “Changes could not be saved in this browser. Keep this window open and copy your work.” |
| Local-data note | “Saved in this browser only. Clearing browser data removes your saved work.” |

Use visible labels for urgency (“Due today”, “Due soon”, “Overdue”, “No due date”, “Done”) and task type (“Feature”, “Bug”). Success is announced only after the operation succeeds.

## 6. Name / wordmark

- **Product name:** Vibecoding Project Tracker; retain the existing name to keep the interface and submitted requirements consistent.
- **Wordmark:** Text only, 24px system sans-serif semibold, `brand-primary`; no invented team name, logo asset or hero illustration.
- **Supporting line:** “Keep the task. Keep the context.” beneath the heading in muted body text.

## 7. Scope and handoff to implementation

M3 delivers this completed design system and matching Tailwind tokens. It does not implement the board, dialogs, urgency timers, member records or clipboard flows; those remain their respective build milestones.

One default light theme. Dark mode, multiple themes, a custom icon pack, remote fonts, elaborate animation and a component-library dependency are unnecessary for this milestone. Member editing and user-customizable colours remain Planned per PRD; design defaults do not promote them to baseline scope. Public deployment is optional under the current PRD.

The visual references above guide composition and behaviour; they do not add features or dependencies. Existing React/Vite/Tailwind configuration and entry files remain in place.
