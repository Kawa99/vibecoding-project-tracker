# Vibecoding Project Tracker — Product Requirements

This document specifies a desktop web prototype for one software development team working on one project. Individual development of the prototype does not remove the product's task ownership and handoff features. It contains functional, non-functional and data requirements only; it does not claim that any feature has been implemented.

**Scope labels:** **Core** = hackathon baseline; **Planned** = desirable extension after the baseline; **Conditional** = required if the corresponding extension is implemented. **Proposed** marks an acceptance rule introduced to resolve an unspecified detail, rather than a confirmed client instruction.

**Requirement sources:** PDF = supplied *Intent_Coding_Hackathon.pdf*, page numbers counted from 1; Meeting = supplied client transcript, timestamps shown; Q&A = user's client-question notes; Starter = supplied PRD, README and DESIGN documents. Client clarification takes precedence where it explicitly relaxes the starter's requirements. Quantitative quality targets and edge-case rules below are proposed implementation criteria.

## 1. Functional requirements

### 1.1 Board and task management

| ID | Scope | Requirement and acceptance criteria | Basis |
|---|---|---|---|
| FR-01 | Core | The application shall provide one Kanban board for one project belonging to one team. It shall not require organization setup or multiple projects before use. | Meeting 8:20–9:11 |
| FR-02 | Core | The board shall display four columns, in order: **To Do**, **In Progress**, **Review**, **Done**. Every task shall appear in exactly the column matching its saved status. Empty columns shall remain visible with an explanatory empty state. | PDF p11; Starter; empty state proposed |
| FR-03 | Core | On first use, the application shall create three or four clearly identifiable example tasks. Subsequent visits shall restore existing data; an intentionally emptied board shall remain empty rather than regenerating examples. | PDF p11; persistence edge case proposed |
| FR-04 | Core | An **Add task** button shall open a modal containing title, description, type, status, assignee, due date and context controls. Saving valid input shall create one task and immediately display its card. System-generated fields shall not require manual entry. | PDF pp11–12, 16 |
| FR-05 | Core | Selecting a task shall open the same modal with its current values. The user shall be able to edit and save its editable fields without changing its identifier or creation date. Cancel or close shall discard unsaved changes. | PDF p12; save/cancel rules proposed |
| FR-06 | Core | The modal shall provide a delete action. Deletion shall require confirmation, remove the selected task only, and remain effective after reload. Cancelling confirmation shall retain the task. | PDF p12; DESIGN; confirmation rule adopted |
| FR-07 | Core | A status dropdown shall allow movement between any of the four stages, including reopening a Done task. Saving shall move the card without duplicating it or losing its other fields. Drag-and-drop shall not be required to change status. | PDF p12; reopening rule proposed |
| FR-08 | Core | Every card shall show its title, task type, assignee and due-date state. Long content shall not obscure controls; the full title, description and context shall remain available in the modal. | PDF pp11, 13–16; overflow rule proposed |
| FR-09 | Core | Saving shall reject a blank or whitespace-only title, unsupported type/status, invalid assignee and invalid nonempty date. Errors shall identify the affected field and preserve the user's draft for correction. Optional fields shall be allowed to remain empty. | Proposed validation criteria |

### 1.2 Task type, ownership and member information

| ID | Scope | Requirement and acceptance criteria | Basis |
|---|---|---|---|
| FR-10 | Core | Tasks shall be classified as **Feature** or **Bug**, distinguished by consistent default colours, text labels and icons wherever task type appears, including the card and modal. | PDF p13; Meeting 12:09–14:01 |
| FR-11 | Core | Every task shall have one identifiable owner selected from a configured member list. Cards shall show initials or an avatar and expose the owner's full name without relying on the image alone. | PDF p14; Meeting 0:00–0:39 |
| FR-12 | Core | A **Hand off to…** dropdown shall let the user assign an existing task to another configured member. The owner indicator shall update, reassignment shall persist, and accessible visual feedback shall acknowledge the change. | PDF p14 |
| FR-13 | Core | The member data structure shall support name, email and GitHub account reference. Name shall be required for ownership; email and GitHub shall be optional profile information. At minimum, configured member records shall supply the owner list. Account authentication and GitHub API integration shall not be implied by storing these fields. | Meeting 10:08–10:30; Q&A; optionality/configuration approach proposed |
| FR-14 | Planned | The user should be able to add and edit member profiles through the interface. Updating a member shall not orphan existing assignments; removal shall require reassignment of that member's tasks. | Meeting 9:11; lifecycle rules proposed |

For an individually built demonstration, configured sample members may demonstrate handoff; they must not be represented as real collaborators or registered accounts. A one-member configuration shall still work, with handoff disabled or explained when no alternative owner exists. This is a proposed demonstration approach, not confirmation that the ownership milestone is waived.

### 1.3 Deadline indicators and colour settings

| ID | Scope | Requirement and acceptance criteria | Basis |
|---|---|---|---|
| FR-15 | Core | The application shall derive a task's urgency from its due date and status, using calm, warning, overdue and neutral visual treatments. Done shall always override deadline urgency and display neutral deadline styling. | PDF p15 |
| FR-16 | Core | Urgency shall update automatically as time passes, including after an idle tab becomes active. Updating or removing a due date and reopening a Done task shall recalculate the indicator. | PDF p15; edge cases proposed |
| FR-17 | Core | Urgency shall have readable text such as **Due today**, **Due soon**, **Overdue**, **No due date** or **Done**, alongside colour. Task type and urgency shall use distinguishable indicators so that an overdue feature remains identifiable as a feature. | Meeting 12:09–14:01; presentation rule proposed |
| FR-18 | Planned | Users should be able to customize task-type and urgency colours and restore accessible defaults. Settings shall persist locally. Custom colours shall retain text/icon meanings and shall be rejected or adjusted if they make required text and controls unreadable under NFR-03. | Q&A; Meeting 12:09–13:20; validation rule proposed |

**Proposed deadline interpretation:** The sources specify safe beyond two days, warning within 24 hours, overdue after the deadline and neutral when Done, but do not define the 24–48-hour interval or date-only boundaries. For this prototype, interpret `dueDate` as the end of that date in the browser's local timezone, with the deadline at the next local midnight. Apply these rules in order:

| Condition | Display |
|---|---|
| Status is Done | Neutral, “Done”, regardless of date |
| No due date | Neutral, “No due date” |
| Current time is at or after the deadline | Overdue treatment and “Overdue” |
| More than zero and at most 24 hours remain | Warning treatment; “Due today” when applicable |
| More than 24 and at most 48 hours remain | Warning treatment and “Due soon” |
| More than 48 hours remain | Calm treatment with the displayed due date |

Compare actual local date boundaries, including daylight-saving changes; do not parse a date-only value as a UTC midnight that shifts the displayed date. Refresh indicators at least once per minute while visible and immediately on tab reactivation. These boundary and refresh rules are proposed defaults requiring review if the client wants a different urgency policy.

### 1.4 Context capture and copying

| ID | Scope | Requirement and acceptance criteria | Basis |
|---|---|---|---|
| FR-19 | Core | The task modal shall contain a clearly labelled, multiline **Context** textarea accepting plain text and Markdown. It shall retain requirements, AI conversations or summaries, debugging logs, traces, attempted approaches, outcomes and next steps without requiring separate fields for each. | Meeting 1:20–3:09; PDF pp4, 16 |
| FR-20 | Core | New tasks shall offer an editable context template with sections for Background, Constraints, Tried so far / Outcome, and Pick up / Next steps. Users shall be able to replace or clear it. | PDF p16; template wording proposed |
| FR-21 | Core | An optional **AI tool** selection shall support Claude, ChatGPT, Cursor, Lovable, Replit and Other, plus no selection. Its value shall persist with the task. | PDF p16; Meeting 1:20–3:09 |
| FR-22 | Core | Saving changed context shall automatically record `contextUpdatedAt` and show a readable last-updated hint. Cancelling edits or saving unrelated fields shall not change this timestamp. Context that has never been saved shall be identified as such. | PDF p16; precise save semantics proposed |
| FR-23 | Core | Every card and its modal shall provide **Copy Context**, copying a readable Markdown briefing containing at least the title, description and entire context, with line breaks preserved and no silent truncation. | PDF p17; Meeting 3:09–3:34 |
| FR-24 | Core | Copying from a card shall use the saved task. Copying from the modal shall use its currently visible draft and shall not implicitly save it. Copy shall not change status, owner or other data, and a card's copy action shall not also open the editor. | Proposed interaction rules |
| FR-25 | Core | Copy success shall be reported only after the clipboard write succeeds. If copying is unavailable or denied, the application shall explain the failure and display selectable briefing text for manual copying. | Proposed reliability/accessibility criteria; toast styling is optional |

Copy output shall use labelled sections such as `# Task title`, `## Description` and `## Context`. Optional task metadata may be included, but it shall not replace the complete context. The user chooses whether to paste into an external AI tool; automated AI requests, API keys and generated AI responses are not baseline requirements.

### 1.5 Deliverables and persistence

| ID | Scope | Requirement and acceptance criteria | Basis |
|---|---|---|---|
| FR-26 | Core | An Anchor Board above the Kanban shall contain four fixed, labelled deliverable slots: **Presentation**, **Demo**, **Report**, **Documentation**. It shall remain available independently of individual task status. | PDF p18; Meeting 3:34–4:46 |
| FR-27 | Core | Each deliverable slot shall allow one URL to be saved, edited, cleared and opened. An empty/filled indicator shall update with the saved value and include a text equivalent; “filled” shall mean a link is recorded, not that its destination or deliverable is verified complete. | PDF p18; semantics proposed |
| FR-28 | Core | Deliverable inputs shall accept valid absolute HTTP or HTTPS URLs and reject unsafe schemes. Invalid entries shall show an error without replacing a previously saved valid link. Links to hosted files satisfy the baseline; binary file uploads and local filesystem paths are not required. | Meeting 3:34–4:46; URL-only baseline from PDF p18; validation proposed |
| FR-29 | Core | Tasks, ownership, context, tool selection, timestamps and anchor links shall persist in browser localStorage and restore after reload or browser restart in the same browser profile and origin, provided the user has not cleared storage. | Starter; PDF pp12, 16, 18 |
| FR-30 | Core | Missing storage shall initialize a new board. Malformed data or failed writes shall produce a useful error rather than silently overwriting existing data or claiming successful persistence. Unsaved input shall remain available for correction or copying. | Proposed failure handling |

### 1.6 Extensions and conditional functionality

| ID | Scope | Requirement and acceptance criteria | Basis |
|---|---|---|---|
| FR-31 | Core selection pending | The prototype shall include one demonstrable additional interaction after the baseline is complete. The chosen feature and its specific acceptance criteria must be recorded before implementation; this requirement is not complete merely because an idea is listed. | PDF p19; Meeting 4:46–5:36, 7:10–7:30 |
| FR-32 | Planned / Conditional | If drag-and-drop is selected for FR-31, dropping a card into another column shall update and persist status, while retaining the keyboard-accessible status dropdown. If collapsible content is selected, controls shall expose expanded/collapsed state and preserve access to hidden content. If sounds are selected, users shall be able to mute them and all feedback shall remain available visually. These are alternative options, not three required features. | PDF p19; accessible acceptance rules proposed |
| FR-33 | Planned / Conditional | If shared private project data is introduced, authorized members shall be able to sign in and sign out, and only members of the relevant team shall be able to read or modify that team's board. Self-registration, if offered, shall not automatically grant access to existing private boards. | Meeting 15:34–16:09; authorization details proposed |
| FR-34 | Planned | Multiple projects, multiple teams, real-time collaboration, GitHub synchronization and Markdown preview may be considered later. They are not hackathon acceptance requirements. Different developer personas shall not require separate permission roles in the baseline. | Meeting 8:20–9:11, 11:15–12:09; Starter; PDF p16 |

## 2. Non-functional requirements

Unless marked Conditional, these apply to the core prototype. The measurable thresholds below are proposed acceptance targets, not claims that the client specified or that the application already meets them.

| ID | Category | Requirement and verification |
|---|---|---|
| NFR-01 | Platform and compatibility | The application shall use a popular web framework and run as a desktop browser application. Retain the supplied React/Vite/Tailwind scaffold for this prototype. Verify the principal flows in current stable Firefox and Chrome at implementation time; record tested versions. A framework migration and native mobile app are not required. |
| NFR-02 | Keyboard and assistive technology | All core operations shall be keyboard accessible with visible focus. Use semantic controls, labelled fields and an accessible dialog name; focus shall enter the modal, remain within it while open and return to its trigger on close. Escape shall follow the same cancel behaviour as Close. Errors and success feedback shall be perceivable by assistive technology without depending on colour or animation. Verify the complete create/edit/move/handoff/copy/delete flow using keyboard navigation and a screen-reader spot check. |
| NFR-03 | Visual accessibility | Normal text shall have at least 4.5:1 contrast against its background; large text and essential control boundaries/focus indicators shall have at least 3:1. Type, deadline and anchor states shall remain understandable without colour perception. Check all chosen default and accepted custom palettes, including warning and overdue cards. These are project targets, not a claim of full accessibility-standard certification. |
| NFR-04 | Layout and readability | At a 1280 × 720 desktop viewport, the board and task form shall be usable without overlapping or unreachable controls. At 200% browser zoom, controls and full task content shall remain reachable by scrolling or reflow. Long titles, URLs and context shall not break layout. A separate phone layout is deferred; desktop-only scope shall not justify inaccessible zoom behaviour. |
| NFR-05 | Consistency and usability | Use consistent stage names, labels, icons, date formatting and form behaviour throughout. Required fields and save/cancel effects shall be clear. A user shall be able to identify owner, type and urgency without opening a card. Confirm destructive deletion and provide informative empty/error states. Record visual choices in DESIGN.md; no client-mandated brand, font or palette exists. |
| NFR-06 | Performance | With 100 tasks, four anchors and up to 1 MiB of serialized application data on the demonstration laptop, target an interactive board within 2 seconds after assets load and visible acknowledgement of ordinary actions within 300 ms. Measure under normal desktop conditions without developer-tool throttling; record the environment. These are proposed prototype targets, not service-level commitments. |
| NFR-07 | Reliability and integrity | A normal save/reload/browser-restart cycle shall retain all supported fields exactly. Editing, handoff and movement shall not change task IDs or creation dates. Failed persistence shall be visible; existing records shall not be silently discarded, duplicated or reseeded. Validate loaded records before using them. |
| NFR-08 | Local data and privacy | The baseline shall make no automatic transmission of board data, profiles or context to an AI service or shared server. Document that localStorage is per browser profile and origin, is not a shared team database or access-control mechanism, and can be lost if browser data is cleared. A deployed static interface shall not embed real private task data in its shipped assets or repository. |
| NFR-09 | Safe input handling | User text, logs and Markdown shall render as text rather than executable HTML. If a Markdown preview is added, unsafe HTML and links shall be sanitized. Deliverable links shall satisfy FR-28, and newly opened external tabs shall not gain access to the originating window. Verify with a script-like context string and a rejected `javascript:` URL. |
| NFR-10 | Conditional: shared-data security | Before enabling network-accessible private board storage, enforce authentication and team authorization at the trusted data layer, use encrypted transport and prevent unauthorized reads/writes. Hiding a board behind a client-side login screen is insufficient. Verify unauthenticated and non-member access rejection. No real credentials or tokens shall be placed in frontend code, localStorage or task examples. |
| NFR-11 | Maintainability and testability | Keep data validation, urgency calculation, context formatting and persistence sufficiently separated from rendering to test their behaviour. Preserve the starter's task field names and stage/anchor IDs unless a documented migration is deliberately introduced. Verify date boundaries, copy completeness, save/cancel, reload and storage/clipboard failure cases. Avoid adding dependencies solely for small utility functions. |
| NFR-12 | Demonstrability and deployment | The prototype shall install, start and produce a build using its documented npm commands, with no uncaught errors during the core demonstration. Local demonstration satisfies the client's hackathon requirement; public deployment is optional. If deployed, verify the same flows there, including clipboard handling, and explain that localhost data does not transfer automatically to the hosted origin. |

## 3. Data requirements

### DR-01 — Task record

Preserve the starter field names and values below. Defaults and validation limits are proposed decisions where the supplied contract is silent.

| Field | Type / permitted values | Rules |
|---|---|---|
| `id` | String | Unique, automatically generated, stable for the lifetime of the task. |
| `title` | String | Required; trim outer whitespace and reject an empty result. Proposed maximum: 200 characters. |
| `description` | String | Optional; default empty string. Preserve multiline text. Proposed maximum: 10,000 characters. |
| `type` | `feature` or `bug` | Required; proposed default `feature`. |
| `status` | `todo`, `in-progress`, `review`, `done` | Required; default `todo`. UI labels shall match FR-02. |
| `assignee` | String | Required configured owner label in the starter-compatible prototype. Labels shall be unique within the member list. A default may be the sole configured member; otherwise require explicit selection. |
| `dueDate` | `YYYY-MM-DD` string or `null` | Optional, valid calendar date, no time component; blank input becomes `null`. Past dates are allowed. Apply FR-15–17's deadline rules. |
| `createdDate` | `YYYY-MM-DD` string | Automatically set to the local creation date; not user-editable. |
| `context` | String | Optional Markdown/plain text with the initial template from FR-20; preserve newlines and Unicode. Proposed maximum: 50,000 characters, rejected visibly rather than truncated. |
| `contextTool` | String or `null` | One of Claude, ChatGPT, Cursor, Lovable, Replit, Other, or `null`. No tool credentials. |
| `contextUpdatedAt` | ISO 8601 timestamp or `null` | Generated on saving changed context. Use an unambiguous timestamp with timezone information, display it locally; unchanged or cancelled drafts shall not update it. Initial empty context has `null`. |

### DR-02 — Member record

Member information shall be distinct from a task and shall not itself constitute an authenticated account.

| Field | Type | Rules |
|---|---|---|
| `name` | String | Required, nonempty display/owner label; unique in this prototype's configured list. |
| `email` | String or `null` | Optional; validate nonempty input as an email address. No automatic email sending is required. |
| `github` | String or `null` | Optional GitHub handle or profile reference; normalize the chosen representation consistently. No API synchronization or proof of account ownership is required. |

This profile structure extends the starter's names-only member list to cover the client's information request. Keep `Task.assignee` as a string for compatibility. If editable profiles are implemented, a name change must update all matching assignments atomically, or the implementation must deliberately migrate to stable member IDs. Do not silently break existing saved tasks.

### DR-03 — Deliverable anchor record

| Field | Type / permitted values | Rules |
|---|---|---|
| `id` | `presentation`, `demo`, `report`, `documentation` | Four fixed unique identifiers. |
| `label` | String | Presentation, Demo, Report or Documentation respectively. |
| `url` | String or `null` | One validated absolute HTTP/HTTPS URL; empty input becomes `null`. |

The empty/filled state shall be derived from the saved URL, not stored as a separate completion flag.

### DR-04 — Storage and state rules

- Save task and anchor collections independently under stable application-specific localStorage keys, such as `vibetracker.tasks` and `vibetracker.anchors`. Persist editable member profiles and colour settings under their own keys if those extensions are implemented.
- Treat a missing collection differently from a valid empty collection. Initialize examples only for a new board, not on every load or after deleting the final task.
- Do not persist derived urgency, display initials or relative-time strings as authoritative data; recalculate them from their source values.
- Use explicit Save for task drafts. Closing, cancelling or copying a draft shall not commit it. Anchor controls shall have a clear save interaction and report failed writes.
- Preserve Unicode, punctuation, indentation and multiline context through save/load/copy. Verify a 50,000-character context round trip without truncation.
- If limits are exceeded or storage is full, retain the draft, explain the issue and allow manual copying. Never report unsaved changes as durable.
- If existing records lack later optional context fields, supply safe defaults without deleting unrelated data. Unreadable data shall not be silently replaced with sample records.
- Clearing browser storage, changing device/browser profile or changing origin is outside local persistence guarantees. Cross-device synchronization, automatic backups, full revision history and concurrent editing are not baseline requirements.
