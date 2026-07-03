# FP1 Audit — Mobile + Accessibility (code-level, read-only)

**Date:** 2026-07-03 · **Scope:** public search surfaces (SearchPage, filter sidebar/drawer, result cards, lesson drawer/detail, Header) + teacher surfaces (SubmissionPage, NewSubmissionForm, RevisingSubmissionForm, UserProfile "My submissions") · **Method:** source reading + computed WCAG contrast ratios (no code or data changed)

---

## Plain-language summary

The search experience is in good shape structurally — the filter drawer and lesson drawer use a proper accessible dialog library, the search box and filters are labeled, and the previously-reported "mobile Filters button never shows" bug is confirmed fixed in the current code. No fixed-width layouts were found that break phones down to 320px wide.

Four things stand out as worth fixing:

1. **The sign-in pop-up is the weakest piece.** It was hand-built before the rest of the app moved to a proper dialog library. Its dimming layer uses a style rule that no longer exists in the current styling toolkit, so the screen behind it likely goes **solid black** instead of see-through gray. It also can't be closed with the Escape key, doesn't keep keyboard focus inside it, and its close (✕) button has no name for screen readers.
2. **On phones, the "Submit Lesson" and "Review" buttons in the top bar lose their text** and become icon-only — but no hidden name was added, so screen-reader users hear an unnamed button.
3. **Several text colors are too light to read comfortably** (they fail the standard contrast rule): the gray used for hints and small labels, and the amber/orange used for "In review" / "Revision requested" — including the reviewer's actual revision note that teachers need to read.
4. **Many tap targets are smaller than the recommended minimum** (some as small as 14×14 pixels — the ✕ that removes a filter). On a phone this makes filtering fiddly.

The "invisible 1×1 pixel checkbox" that test automation stumbles on is **not** an accessibility bug — it's the standard, correct way to build a custom-styled checkbox (details below).

**Counts:** 0 findings break a flow outright (P1) · 7 degrade the experience (P2) · 9 are polish (P3).

---

## Key
- **Severity:** P1 user-breaking · P2 degraded · P3 polish
- **Effort:** S (small, hours) · M (medium, a day-ish) · L (large)
- **Confidence:** high / medium / low, per finding
- 🔍 = needs a live-browser check by FP2 to fully confirm rendered behavior

---

## P2 — degraded experience

### F1. AuthModal backdrop is likely solid black (`bg-opacity-50` no longer exists in Tailwind v4) 🔍
- **Where:** `src/components/Auth/AuthModal.tsx:73` — `className="fixed inset-0 bg-black bg-opacity-50 …"`
- **Why:** the project is on `tailwindcss ^4.3.1` (`package.json:108`). Tailwind v4 removed the `*-opacity-*` utilities (v3 syntax); the class generates no CSS, so the backdrop renders as opaque `bg-black`. Every sign-in (public header, SubmissionPage, NewSubmissionForm, RevisingSubmissionForm, UserProfile) blacks out the page behind the modal.
- **Repro sketch:** open the site logged out → click user icon → Sign In → area behind the white card is 100% black instead of 50% translucent.
- **Fix shape:** `bg-black/50` (one token).
- **Severity P2 · Effort S · Confidence high** (utility removal is certain; exact visual = live check)

### F2. AuthModal is not an accessible dialog (unlike every other modal in the app)
- **Where:** `src/components/Auth/AuthModal.tsx:72–79` (container + close button), `:88` and `:107` (labels)
- **Evidence:**
  - No `role="dialog"`, no `aria-modal`, no focus trap, no Escape-to-close, no focus restore on close — it's a plain fixed `div`. Keyboard users can Tab straight out into the page behind it (a keyboard "leak", the inverse of a trap); screen readers aren't told a dialog opened.
  - Close button (`:74–79`) contains only `<X size={24} />`. lucide-react marks icons `aria-hidden="true"` by default (verified in `node_modules/lucide-react/dist/cjs/lucide-react.js:69`), so the button's accessible name is **empty**.
  - `<label>` elements for Email/Password have no `htmlFor`, and inputs have no `id`/`aria-label` — the fields are unlabeled programmatically (placeholder only).
- **Inconsistency:** `IntLessonDrawer` and `IntMobileFilterDrawer` (`src/components/Internal/`) both use Headless UI `Dialog`, which handles all of this. AuthModal predates that migration.
- **Fix shape:** rewrap in Headless UI `Dialog` + `DialogTitle`, add `aria-label="Close"` to ✕, wire `htmlFor`/`id` on the two fields.
- **Severity P2 · Effort M · Confidence high**

### F3. "Submit Lesson" and "Review" topbar links have empty accessible names on phones
- **Where:** `src/components/Layout/Header.tsx:76–79` (Submit) and `:81–84` (Review)
- **Evidence:** the text is `<span className="hidden sm:inline">…` — `display:none` below 640px, which removes it from accessible-name computation. The icons (`Plus`, `Shield`) are explicitly `aria-hidden="true"` (`:77`, `:82`). Net accessible name below 640px: **""** — a screen-reader user on a phone hears "link" with no name for the primary CTA.
- **Fix shape:** swap `hidden sm:inline` for `sr-only sm:not-sr-only` on the spans, or add `aria-label` to each Link.
- **Severity P2 · Effort S · Confidence high**

### F4. Amber/orange status colors fail contrast — including the revision note teachers must read
- **Where (tokens):** `src/index.css:53–54` — `--color-esy-amber-review: #B8860B`, `--color-esy-orange-revision: #C97A2A`
- **Computed ratios (WCAG relative luminance):**
  - `#B8860B` on white: **3.25:1** — used by `.adm-status--review` / `--pending` (`src/styles/internal-admin.css:212,218`) at 10px uppercase (needs 4.5:1)
  - `#B8860B` on `#FEF7E6`: **3.05:1** — `.adm-callout--warning` (`internal-admin.css:1644–1648`) sets `color` on the whole callout, so the reviewer's **revision-reason paragraph** (13px body text, `src/pages/UserProfile.tsx:576–605`) renders at 3.05:1
  - `#C97A2A` on white: **3.33:1** — `.adm-status--revision` (`internal-admin.css:215`)
- **Fix shape:** darken the two tokens (e.g. amber → ~#8a6508, orange → ~#9d5f1f) or scope the callout's low-contrast color to the title only and use `--esy-ink` for body text.
- **Severity P2 · Effort S · Confidence high** (computed; no live check needed)

### F5. `ink-50` (#808080) small text fails contrast across both stylesheets
- **Computed:** `#808080` = **3.95:1** on white, **3.72:1** on paper `#FAF8F3`, **3.41:1** on paper-alt `#F2EEE4` — all below the 4.5:1 requirement for the 10–13px sizes it's used at.
- **User-facing instances (not exhaustive):**
  - `.adm-hint` (`internal-admin.css:283–288`, 12px) — carries the **"share your doc: Anyone with the link (Viewer)"** instruction on the teacher submit form (`src/pages/NewSubmissionForm.tsx:130`), which is the #1 cause of failed submissions if missed
  - `.adm-readonly--muted` (`internal-admin.css:1575`) — "No schools assigned" / "Not provided" on UserProfile
  - `.adm-submission-row-type` (`:1689`, 11px) and `.adm-submission-row-meta` (`:1706`, 12px) — "New lesson"/"Update" + submitted/reviewed dates in My submissions
  - `.int-check-count` (`src/styles/internal.css:250`, 11px facet counts), `.int-card-top` (`:697–708`, 11px grades line on cards), `.int-row-right`/`.int-detail-empty` (`:397–401`, `:746–752`)
  - `.adm-status--inactive` (`internal-admin.css:217`)
- **Borderline sibling:** `--color-esy-red #E03127` passes on white (4.53) but drops to **3.91** on the paper-alt hover background — the red "Cook" activity label inside a hovered list row (`internal.css:346,393`).
- **Fix shape:** introduce a darker "muted text" token (~#6b6b6b = 5.3:1 on white) and point text-level `ink-50` usages at it; keep `ink-50` for borders/decoration.
- **Severity P2 · Effort S–M · Confidence high** (computed)

### F6. Touch targets widely below the 24px WCAG 2.5.8 minimum (and far below the 44px comfort bar) 🔍
All sizes derived from CSS (padding + font/icon size); FP2 should confirm rendered boxes. On phones the filter drawer and toolbar are the **primary** interaction surface.

| Control | Where | Approx. size |
|---|---|---|
| Active-filter pill remove ✕ | `.int-pill button` `internal.css:322–326` (2px padding + 10px svg) | **~14×14px** |
| Search-clear ✕ in topbar | `.int-search-clear` `internal.css:81–85` (4px + 12px icon) | ~20×20px |
| Filter checkbox rows (incl. mobile drawer) | `.int-check` `internal.css:200–209` (13px text, 4px vertical padding; 14px visual box `:228`) | rows ~21–24px tall |
| Mobile **Filters** trigger button | `.int-mobile-filter-btn` `internal.css:537–551` (4px 10px padding, 11px font) | ~24px tall |
| View/density switcher segments | `.int-switch button` `internal.css:767–779` (`min-height: 24px`) | 24px tall |
| Grade pills | `.int-grade-pill` `internal.css:261–271` | ~26px tall |
| "Clear all" filters | `.int-sidebar-clear` `internal.css:154–161` (11px, 2px padding) | ~16px tall |
| Drawer close buttons | `.int-drawer-close` `:453`, `.int-mobile-filter-drawer-close` `:860` (6px + 16px icon) | 28×28px |
| Small buttons: **resubmit**, "New submission" | `.adm-btn--sm` `internal-admin.css:186` (5px 10px, 10px font) used at `UserProfile.tsx:533,589` | ~21px tall |
| "Back" on profile header | `.adm-back` `internal-admin.css:126–142` (10px font, 4px 0 padding) | ~18px tall |
| No-results suggestion pills | `.int-pill` buttons `SearchPage.tsx:214–224` | ~20px tall |

- **Fix shape:** a mobile-scoped rule set bumping padding/min-height (e.g. 44px rows in the filter drawer, ≥24px everywhere; enlarge the ✕ hit areas with padding, not icon size).
- **Severity P2 · Effort M · Confidence high** (sizes are arithmetic from CSS; exact px = live check)

### F7. iOS Safari auto-zoom: form controls at 12–14px font 🔍
- **Where:** `.int-search input` 14px (`internal.css:64–74`) — the main search box; `.adm-input/.adm-textarea/.adm-select` 14px (`internal-admin.css:289–302`) — teacher submit forms + profile; `.int-sort` select 12px (`internal.css:298–306`).
- **Why:** iOS Safari zooms the page when focusing any control with font-size <16px. The viewport meta (`index.html:6`) correctly does NOT set `maximum-scale`, so zoom-block is not available (and shouldn't be) — the fix is 16px inputs on touch/small screens.
- **Repro sketch:** iPhone Safari → tap the header search box → page zooms in and stays zoomed after dismissing the keyboard.
- **Severity P2 · Effort S · Confidence medium** (behavior is well-known; confirm on device/emulator)

---

## P3 — polish

### F8. Result cards/rows as `role="button"` divs: flattened semantics, oversized names, selection state not exposed
- **Where:** `IntListRow.tsx:57–66`, `IntCard.tsx:25–33` (public); same pattern `IntQueueRow.tsx:44–51`, `IntDuplicateCard.tsx:47–54` (internal).
- **Pattern consistency (asked explicitly): GOOD.** All four implement `tabIndex={0}` + Enter/Space keydown identically; `IntQueueRow:127` correctly makes its visual "Review" CTA `aria-hidden` to avoid nested-interactive; `LessonSearchPicker` uses a proper combobox/listbox instead. No keyboard traps anywhere.
- **Gaps:**
  1. `role="button"` makes descendants presentational — the `<h3>` titles (`IntListRow.tsx:69`, `IntCard.tsx:36`) are not exposed as headings, so screen-reader users can't jump result-to-result by heading; the button's accessible name is the entire card text (title+summary+meta+"Open").
  2. `IntDuplicateCard` exposes selection via `aria-pressed` (`:52`) but `IntListRow`/`IntCard` take a `selected` prop and expose **nothing** (visual `.selected` class only) — inconsistent within the same design system.
  3. The results list is bare divs — no `list`/`listitem` semantics, so no "x of y" context.
- **Fix shape:** make the title an interior heading+button (or `aria-labelledby` the title), add `aria-pressed`/`aria-current` for `selected`, wrap results in a `<ul>`.
- **Severity P3 · Effort M · Confidence high** (pattern), medium (user impact)

### F9. Header user menu: no Escape, no `aria-haspopup`, focus not restored
- **Where:** `Header.tsx:87–168`. Outside-`mousedown` closes it (`:46–54`) but Escape does nothing and closing never returns focus to the trigger. Trigger has `aria-expanded` (`:93`) but no `aria-haspopup`/`aria-controls`.
- **Severity P3 · Effort S · Confidence high**

### F10. View/density switchers use `role="radiogroup"` without the radio keyboard model
- **Where:** `IntViewSwitcher.tsx:23–39`, `IntDensitySwitcher.tsx:20–37` — every `role="radio"` button is a separate Tab stop; Arrow keys don't move selection (APG radiogroup expects roving tabindex + arrows). Works, but announces as radios and then behaves as buttons.
- **Fix shape:** either implement roving-tabindex arrows, or drop to plain buttons with `aria-pressed`.
- **Severity P3 · Effort S · Confidence high** (pattern), low (impact)

### F11. Skip link is not the first focusable element
- **Where:** `App.tsx:106–108` renders `<Header>` before `<main>`; the SkipLink lives inside SearchPage (`SearchPage.tsx:108`). Keyboard users tab through brand/search/Submit/user-menu before reaching "Skip to main content". It still earns its keep — it's placed before the ~50-checkbox sidebar and targets `#main-content` (`SearchPage.tsx:117`, `tabIndex={-1}` correctly set) — but convention is first-in-DOM.
- **Severity P3 · Effort S · Confidence high**

### F12. `IntFormField` wires `<label htmlFor>` to non-labelable elements on read-only fields
- **Where:** `IntFormField.tsx:49–63` clones the single child and injects the id regardless of element type; `UserProfile.tsx:372–383` passes `<p>`/`<div>` children (Email, Role, Schools) → `label[for]` points at a `<p>`. No user harm, fails HTML validation/axe "label-for" checks.
- **Fix shape:** only inject `htmlFor` when the child is an input/select/textarea; otherwise render the label as a plain `<span class="adm-label">`.
- **Severity P3 · Effort S · Confidence high**

### F13. Submission success view: heading/focus discontinuity
- **Where:** `NewSubmissionForm.tsx:90–113` and `RevisingSubmissionForm.tsx:107–142` — on success the whole form is replaced by a card whose top heading is an `<h2>` ("Submitted!") with no `<h1>`, and focus is not moved to it (the previously-focused Submit button unmounts, so focus drops to `<body>`). A screen-reader user gets silence after the most important action on the page.
- **Fix shape:** `h1` + `ref.focus()` on the confirmation heading (or a `role="status"` wrapper).
- **Severity P3 · Effort S · Confidence medium**

### F14. Focus visibility is inconsistent: custom rings on some controls, border-color-only on inputs, UA-default on card rows 🔍
- **Where:** rings exist for `.int-check` (`internal.css:224–227`), `.int-switch` (`:791–794`), `.adm-btn` (`internal-admin.css:189`). But `.int-search input:focus` (`internal.css:75`) and `.adm-input:focus` (`internal-admin.css:303–308`) set `outline: none` with only a 1px border-color change (gray→green) — a weak indicator; and the `role="button"` rows/cards define no `:focus-visible` at all, relying on the UA default ring (present, but visually foreign to the design system).
- **Live check:** confirm the UA ring actually renders on `.int-list-row`/`.int-card` in Chrome/Safari and that the input border shift is perceivable.
- **Severity P3 · Effort S · Confidence medium**

### F15. Long resubmit button label at 320px 🔍
- **Where:** `UserProfile.tsx:601` — "I've updated my doc — send it back for review" inside `.adm-btn--sm` (uppercase, `letter-spacing: 0.12em`, `line-height: 1`, `internal-admin.css:146–163,186`). At ~320px viewports the label must wrap inside a callout ~250px wide; `line-height:1` wrapping of uppercase text may collide lines or overflow the callout.
- **Severity P3 · Effort S · Confidence low** (pure layout math — needs live check)

### F16. Small announcements bundle
- Split-view rail (`IntSplitDetail.tsx`) swaps lesson content with no announcement or focus move — desktop-only, mild (`SearchPage.tsx:248–250`).
- "Open Lesson Plan" (`IntLessonDetail.tsx:47–56`) opens a new tab with no "(opens in new tab)" hint for AT users.
- `ScreenReaderAnnouncer.tsx:44–56` announces "All filters cleared. Showing all N lessons" on first settle of a fresh page load (no filters were ever set) — slightly misleading first announcement.
- **Severity P3 · Effort S · Confidence high** (code-visible), low (impact)

---

## Explicit verdicts requested by the task

### The 1×1px checkbox — automation quirk, NOT an a11y bug
`.int-check input` (`src/styles/internal.css:214–223`) is the standard **sr-only clip** pattern: `position:absolute; width/height:1px; clip-path:inset(50%)`. The input remains keyboard-focusable, exposed to screen readers (name = wrapping label's text, including the facet count), and has a visible focus ring on its styled twin (`:224–227`). This pattern is itself the **fix** for a real earlier bug (`display:none` removed the checkboxes from the a11y tree) and is guarded by a regression test (`e2e/accessibility.spec.ts:98–123`). Automation must click the `label.int-check` (as `e2e/cultural-heritage-filter.spec.ts:63–76` already does) rather than the input's 1×1 box.
- One doc nit: the comment at `e2e/cultural-heritage-filter.spec.ts:70` still says the input is `display:none` — stale, worth a one-line correction next time that file is touched.

### `role="button"` pattern consistency — consistent
All four implementations (`IntListRow`, `IntCard`, `IntQueueRow`, `IntDuplicateCard`) share the same correct keyboard contract; the only divergence is selection-state exposure (see F8.2). No keyboard traps found anywhere in the audited surfaces; both drawers use Headless UI `Dialog` (focus trap + Escape + focus restore for free).

### Fixed widths under 400px — none found breaking
- Cards grid `minmax(280px, 1fr)` (`internal.css:674`) fits ≥312px viewports.
- Drawers use `min(480px, 92vw)` / `min(300px, 86vw)` (`internal.css:447,830`).
- `.adm-page` collapses padding at ≤900px (`internal-admin.css:3027→` block at `:1328–1338`); admin multi-column grids all collapse at ≤900/960px.
- Toolbar wraps below 768px (`internal.css:588–593`), and the C57 source-order fix that makes the mobile Filters button appear is present and correctly documented (`internal.css:533–551, 796–806`).
- 🔍 Worth one 320px live pass anyway: topbar (brand + search + 2 icon buttons in a 56px bar, `internal.css:554–557`) and the wrapped toolbar row.

---

## Suggested FP2 live-browser checklist
1. **F1** — open AuthModal: is the backdrop opaque black? (logged-out, click user icon → Sign In)
2. **F7** — iPhone/emulated Safari: focus header search + `adm-input`; does the page zoom?
3. **F6** — tap-target overlay (DevTools or axe) on: mobile filter drawer rows, active-pill ✕, toolbar switchers, resubmit button.
4. **F14** — keyboard-Tab through results in list + grid view: is a focus ring visible on rows/cards in Chrome and Safari?
5. **F15** — UserProfile at 320px with a `needs_revision` submission: does the resubmit button wrap cleanly?
6. 320px sweep of topbar + toolbar + lesson drawer (no horizontal scroll anywhere).
7. Run axe on `/`, `/submit`, `/submit/new`, `/profile` (logged in as teacher) — should independently re-flag F3/F4/F5/F12 and catch anything this code pass missed.
