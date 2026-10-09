# Bardy Design System

**Brand:** Sprout (green)
**Date:** 2026-10-09

This file is the source of truth for Bardy's visual language. Two companions sit next to it:

- `theme.css` holds the same tokens as CSS variables and a Tailwind v4 `@theme`, ready to import into the renderer.
- `design-system.html` is the visual reference: every swatch, the type scale, and live components. Open it in a browser.

When the three disagree, this file wins. Update it first, then the other two.

## Look and feel

A flat storybook paper look: white canvas, chunky rounded display type, and sticker-like controls with a thick border and a heavier bottom edge (the "lip"). One saturated green means progress. Body text stays gray so colored headings and actions lead.

- No shadows, gradients, or glass effects in the app UI. Depth comes from borders and the lip.
- Text never sits directly on illustration; surfaces stay flat fills.

## Color

Use tokens, never raw hex codes, in components. Tailwind class names follow the token: `--primary` becomes `bg-primary`, `text-primary`, `border-primary`.

### Brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | `#58cc02` | `#58cc02` | Main buttons, progress bars, wordmark, pet body |
| `--primary-lip` | `#58a700` | `#58a700` | Bottom edge of green buttons, pet shading |
| `--primary-ink` | `#3f9600` | `#a5ed6e` | Headings and green text on the page background |
| `--primary-soft` | `#a5ed6e` | `#a5ed6e` | Bars, tints, pet leaf and eyes |
| `--primary-wash` | `#d7ffb8` | `#233a17` | Selected and highlighted backgrounds |
| `--on-primary` | `#ffffff` | `#ffffff` | Text on green fills |

### Accents

| Token | Light | Dark | Use |
|---|---|---|---|
| `--link` | `#1cb0f6` | `#1cb0f6` | Links, secondary buttons, focus ring, current nav item, selected tab or option |
| `--link-lip` | `#1899d6` | `#1899d6` | Bottom edge of blue fills |
| `--night` | `#000437` | `#dfe3ff` | Dark buttons, deep emphasis, pet face |
| `--streak` | `#ff9600` | `#ff9600` | Day-streak counter and streak calendar |

### Feedback

These never change with the brand, so a right answer always looks right.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--success` | `#58cc02` | `#58cc02` | Correct answers, mastered |
| `--success-wash` | `#d7ffb8` | `#23380f` | Correct answer background |
| `--danger` | `#ff4b4b` | `#ff4b4b` | Wrong answers, errors, destructive actions |
| `--danger-lip` | `#ea2b2b` | `#ea2b2b` | Bottom edge of red buttons |
| `--danger-wash` | `#ffdfe0` | `#3f1f23` | Wrong answer and error background |
| `--warning` | `#ffc800` | `#ffc800` | Due soon, highlights in documents |
| `--warning-wash` | `#fff5d3` | `#3a3112` | Due-soon background |

### Neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#ffffff` | `#131f24` | Window background |
| `--surface` | `#ffffff` | `#131f24` | Cards, panels |
| `--surface-2` | `#f7f7f7` | `#1b2b32` | Inputs, hover fills, quiet panels |
| `--fg` | `#4b4b4b` | `#f1f7fb` | Headings and body text |
| `--fg-muted` | `#777777` | `#a3b4bd` | Secondary text, labels |
| `--fg-faint` | `#afafaf` | `#52656d` | Placeholders, disabled text |
| `--border` | `#e5e5e5` | `#37464f` | Card and control borders, dividers |
| `--border-strong` | `#afafaf` | `#52656d` | Outlined pills and tabs |

### Color rules

- Green is for progress: main buttons, progress bars, the wordmark, headings. Keep it off body text and small links.
- Blue is for links and interactive selection only.
- White text on green or red fills only at 14–15px bold uppercase (button labels). White on `#58cc02` is about 2.2:1, so use `--fg` or `--night` for anything smaller.
- Tints for selected states use `--primary-wash`, or a 10–14% mix of `--link` into `--bg` for blue selections.

## Typography

| Role | Font | Size / line height | Weight | Tracking | Tailwind |
|---|---|---|---|---|---|
| display | Nunito | 64 / 1.2 | 900 | -0.02em | `font-display text-display` |
| heading | Nunito | 48 / 1.2 | 900 | -0.02em | `font-display text-heading` |
| heading-sm | Nunito Sans | 32 / 1.2 | 800 | 0 | `font-body text-heading-sm` |
| subheading | Nunito Sans | 19 / 1.4 | 700 | 0 | `text-sub` |
| body | Nunito Sans | 17 / 1.4 | 500 | 0 | `text-body` |
| label | Nunito Sans | 15 / 1.33 | 800, uppercase | 0.053em | `text-label uppercase` |
| caption | Nunito Sans | 13 / 1.23 | 700 | 0 | `text-caption` |

- Load from Google Fonts: Nunito 800, 900 and Nunito Sans 500, 700, 800.
- In app screens, page titles use Nunito 900 at 26–34px; the 48 and 64 sizes are for empty states and onboarding.
- Numbers that line up (stats, timers, counters) use `tabular-nums`.
- Keep reading text near 65 characters wide.

## Space, shape, edges

- **Spacing:** 4px base. Steps: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96. Tailwind's default spacing scale already matches (`p-3` = 12px).
- **Gaps:** 12px between elements, 16–24px card padding.
- **Radius:** 12px for controls (buttons, inputs, pills, tabs), 16px for cards, 20–24px for hero cards and flashcards, full for progress bars and avatars.
- **Borders:** 2px everywhere.
- **Lip:** pressable things get a 4px bottom border in a darker shade. On press, move down 2px and shrink the lip to 2px.
- **Layout:** sidebar 232px; main content max width about 1180px; side padding 32px (16px when narrow).

## Components

Each recipe names the tokens it uses. The HTML reference shows them live.

**Primary button.** `--primary` fill, `--on-primary` text, 4px `--primary-lip` bottom border, 12px radius, 12–13px by 18–20px padding, label type (800, uppercase, 0.053em). One per screen.

**Secondary button.** `--surface` fill, `--link` text, 2px `--border` border with a 4px bottom edge.

**Dark button.** `--night` fill, `--bg` text. For actions like "Upload notes".

**Danger button.** `--danger` fill, white text, `--danger-lip` lip.

**Ghost button.** No fill or border, `--fg-muted` or `--primary-ink` text.

**Disabled button.** `--border` fill and lip, `--fg-faint` text, no press movement.

**Text input.** `--surface-2` fill, 2px `--border`, 12px radius, 12–14px padding, 16–17px body text. Focus: border `--link`, fill `--surface`. Error: border `--danger`, fill `--danger-wash`, red caption message below.

**Pill / badge.** 12–13px label type, 2px border, 10–12px radius. Variants: brand (`--primary-wash` + `--primary`), mastered (`--success-wash` + `--success`), due (`--warning-wash` + `--warning`), struggling (`--danger-wash` + `--danger`), neutral (`--border-strong`).

**Tabs.** Outlined buttons with 2px `--border-strong`. Selected: `--link` border and text on a light blue tint.

**Progress bar.** 14–16px tall, full radius, `--border` track, `--primary` fill with a faint white highlight line 3–4px from the top.

**Quiz option.** Full-width button, number key box on the left, 2px border with 4px lip. Selected: blue. After checking: correct gets `--success` + `--success-wash`; wrong gets `--danger` + `--danger-wash`.

**Answer feedback bar.** Full-width footer on the study screen. Correct: `--success-wash` background, green Nunito 900 heading ("Nice work!"), green Continue button. Wrong: `--danger-wash`, red heading ("Not quite"), the correct answer, red "Got it" button.

**Flashcard.** 2px border with a 6px bottom edge, 24px radius, centered Nunito 900 term. Flip shows the definition in `--fg-muted` and the four rating buttons: Again, Hard, Good, Easy.

**Deck row.** Card with a 48px rounded subject tile, title, source PDF caption, small progress bar, and a status pill on the right.

**Stat tile.** 2px border, 12px radius, Nunito 900 number (26–28px), uppercase caption. Colors: streak `--streak`, recall `--primary-ink`, counts `--link`.

**Side navigation.** Uppercase label buttons with a 24px icon. Current item: `--link` text and border on a light blue tint.

**Chat.** User messages right-aligned on a light blue tint. Bardy replies left-aligned with a 2px border, a small green "Bardy" label, and page citations as small blue outlined chips ("p. 14").

## Writing

- Short, direct, encouraging. "Nice work!", "Not quite", "12 cards are due."
- Buttons say what happens: "Start session", "Check", "Continue".
- Errors say how to fix it: "Set a goal of at least 5 minutes."
- AI answers always cite the page they came from.

## The pet

A floating desktop companion that brings the window back when clicked. Pixel art on a 16 × 18 grid, drawn at 6× (96 × 108px) with `image-rendering: pixelated`.

| Key | Color | Part |
|---|---|---|
| `G` | `#58cc02` | Body |
| `D` | `#58a700` | Shading, feet |
| `L` | `#a5ed6e` | Leaf |
| `S` | `#58a700` | Stem |
| `F` | `#000437` | Face screen |
| `E` | `#a5ed6e` | Eyes and mouth |
| `W` | `#d7ffb8` | Shine |

Awake:

```text
......LL.LL.....
.....LLLSLLL....
........S.......
....GGGGGGGG....
..GGGWGGGGGGGG..
.GGWGGGGGGGGGGG.
.GGFFFFFFFFFFGG.
GGFFFFFFFFFFFFGG
GGFFEEFFFFEEFFGG
GGFFEEFFFFEEFFGG
GGFFFFFFFFFFFFGG
GGFFFFFEEFFFFFGG
.GGFFFFFFFFFFGG.
.GGGGGGGGGGGGGG.
..DGGGGGGGGGGD..
...DDDDDDDDDD...
...GG......GG...
...DD......DD...
```

Asleep (while the window is open), replace rows 9 and 10:

```text
GGFFFFFFFFFFFFGG
GGFEEEFFFFEEEFGG
```

Behavior:

- Sleeps while the main window is open; wakes when the window is minimized or closed.
- Bobs 6px up and down every 2.4s; no bob when reduced motion is on.
- Click opens the window. Drag moves it. A speech bubble shows what's due ("12 cards are due. Tap me to study!") and opens flashcards.
- A small dark pill under it holds Quick ask and Voice buttons.
- Hidden while the app is full screen.
