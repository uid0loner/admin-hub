# admin_hub visual evolution

Brief of 2026-10-23: take the site to a premium, unmistakable level across every page, keep every piece of
content and every function, keep the colour identity. This file holds the audit, the direction and the plan.
It is not published (only `admin_hub_site/` is).

## Absolute rule and how it is enforced

Nothing is deleted, shortened or replaced. `automation/check_site.py` runs on every push and compares each page
with `automation/baseline.json`: a page that disappears, loses more than 3 % of its visible words, loses an
element id that a script can reach, or loses an internal link fails the build. The baseline is only rewritten
after an intended content change (`python3 automation/check_site.py --baseline`), never to make a redesign pass.

## Audit (2026-10-23)

- Stack: static HTML, one stylesheet, plain JavaScript, Cloudflare Pages, no build step. 209 pages, 79 scripts
  (2.1 MB), one service worker, own search, own translator, keyboard layer (`?`, `g t`, `/`). Keep all of it.
- Stylesheet: 156 KB, 1,913 lines, written as successive passes that override each other
  (visual upgrade, design 1 to 7, per-tool blocks). 129 `!important`, 200 hard-coded hex values next to the
  tokens, 177 one-off `rgba()` glows, 46 different font sizes, 8 radii (2 to 10 px and 99 px), 116 media
  queries, 329 inline `style=""` attributes in the pages.
- Tokens that exist: `--bg #07051a`, `--panel #0d0b2b`, `--line #2a2466`, `--text #d6d9ff`, `--dim #8a86c9`,
  `--blue #4da3ff`, `--violet #b45cff`, `--hot #ff4fd8`, plus `--sans` (IBM Plex Sans) and `--mono` (JetBrains Mono).
  No light theme. Semantic colours (ok, warn, fail) are spread over per-tool rules.
- Home, desktop: the hero sits in the left half with an empty right half; below it four directory blocks that
  look the same. Strong content, weak composition.
- Home, mobile (390 px): the main navigation is a sideways-scrolling row that cuts off after "checklists";
  no menu. Everything else stacks correctly, no horizontal overflow.
- Tool pages: honest and readable, but input, result and help sit in one column of the same weight;
  result panels, tables and chips each have their own look.

## Direction: "instrument panel"

admin_hub should feel like a precise instrument, not a poster: the calm of a well-made console, light used only
where something is live or needs attention.

- Colour: the eight tokens stay and become the root of a tonal scale. Surfaces in four steps from `--bg`
  (page, sunken, raised, overlay), each a little lighter and bluer. Lines in two strengths. Blue = interactive
  and information, violet = identity and selection, hot pink = attention, used sparingly. New semantic set
  derived to sit with the palette: ok (teal-green), warn (amber), fail (the existing hot), all meeting 4.5:1.
- Light: one soft radial light per page at the top, a fine grid that fades out, a 1 px top highlight on raised
  surfaces. Glow only on focus, live state and the primary action. No blobs, no glass everywhere.
- Type: keep the pair. JetBrains Mono for identity, headings, labels and data; IBM Plex Sans for reading.
  A fixed scale of 8 steps (12, 13, 14, 16, 18, 22, 30, 44 to 64 fluid), tabular numbers in data,
  65 to 72 characters per line in prose, tighter tracking on large mono headings.
- Space and shape: 4 px base scale (4, 8, 12, 16, 24, 32, 48, 64, 96). Two radii: 6 px for controls,
  10 px for surfaces; pills only for chips. Content widths: prose 720, tool 1120, directory 1240.
- Motion: 120 ms for state, 200 ms for panels, 320 ms for page level, one easing curve. Respect
  reduced motion everywhere. Nothing moves on its own except the terminal caret and live indicators.
- Signature elements: the prompt breadcrumb, the home terminal, the bottom status line, the `_` caret.
  They stay and get better, they are what makes the site recognisable.

## Plan, one round per "WEITER"

Each round is small enough for the usage limit, ends with the check green, screenshots at 1440 and 390 px,
and a commit. Order follows the brief: foundation, home, then the rest of the platform.

- V1 Foundation: token layer (surfaces, lines, semantic colours, type scale, space, radii, motion, elevation)
  at the top of the stylesheet, old values mapped onto it; no visible change except contrast fixes.
- V2 Navigation: header with a real mobile menu (all destinations, large touch targets), a refined desktop
  bar, the search trigger as a command bar, breadcrumb and status line on the new tokens.
- V3 Home: new hero composition (headline left, live terminal as the centrepiece with real tool previews
  next to it), the area map as a distinct discovery band, counts and "new here" as an instrument strip.
- V4 Components: buttons, inputs, selects, chips, tabs, accordions, tooltips, alerts, empty, error and
  loading states, one set with all states, replacing the scattered variants.
- V5 Tool frame: input, result and help as distinct regions, a sticky result header with copy and export,
  one result panel, one table, one stat strip, one severity legend for all analyzers.
- V6 Reading pages: cheat sheets, checklists, explainers, glossary and guides with a reading layout,
  side table of contents on wide screens, better code blocks.
- V7 Directories and search: tools, cheat sheets, checklists, explainers and news as browsable
  directories with grouping and filtering; search results grouped and keyboard first.
- V8 Polish and proof: inline styles moved into classes, `!important` and dead rules removed,
  accessibility (contrast, focus, keyboard, screen reader) and performance pass, before and after report.

## Token reference (V1, top of style.css)

- Palette: `--bg --panel --line --text --dim --blue --violet --hot`, as channels for tints:
  `rgb(var(--blue-rgb) / .3)` (also `--warn-rgb`, `--text-rgb`, `--dim-rgb`, `--line-rgb`, `--panel-rgb`, `--bg-rgb`).
- Surfaces `--s-sunk --s-page --s-panel --s-raise --s-over`; lines `--line-1 --line-2 --line-hi`.
- Meaning `--ok --warn --fail --info`.
- Type `--fs-1` to `--fs-8`, `--fs-display`, `--lh-tight --lh-head --lh-body`, `--measure`.
- Space `--sp-1` (4 px) to `--sp-9` (96 px). Shape `--r-ctl --r-surf --r-pill`. Widths `--w-prose --w-tool --w-dir`.
- Motion `--ease --t-fast --t-med --t-slow` (all 0 under reduced motion).
- Elevation `--e-1 --e-2 --e-3`, `--glow-focus`, `--glow-live`.

Rule for every later round: new and touched rules use tokens only, no new hex values, no new `!important`.

## Before and after (2026-10-23, start a7924d0, end v79)

What changed for visitors
- Navigation: a real menu up to 1180 px instead of a sideways scrolling row that cut off; search as a command bar.
- Home: two-column hero with the live terminal as the centrepiece, counts as an instrument strip, areas as a
  discovery band, news as live panels, "new here" as a timeline.
- Every page: one set of buttons, fields, chips and disclosure sections with all states; tables, stat strips and
  verdicts as framed surfaces; one severity legend on every analyzer; a result header with "copy result" and
  "print" that stays in view while reading findings.
- Reading pages: table of contents beside the text from 1240 px, reading measure, code blocks with copy.
- Directories: filter bar stays visible, empty state with a way to the full search; search results grouped.
- Print: head line with title, address and date, page numbers, closed sections open.

Numbers
- Hard-coded colours outside the token layer: 200 hex values and 177 rgba tints before; 8 hex values left, all in
  print or data URIs.
- Inline style attributes: 329 before, 73 after (256 margins moved onto the 4 px spacing scale).
- Search index: 622 KB (190 KB compressed) loaded on every page before; now only when search is about to be used.
- Stylesheet: 153 KB before, 186 KB after (39 KB compressed); the growth is the component, navigation, home
  and tool layers. `!important`: 129 before, 135 after, 99 of them in print rules where they are needed.
- Accessibility: own audit of all 209 pages (contrast against the real background, names, labels, alt, ids,
  heading order) with no findings; focus visible on the first 12 tab stops of 15 pages. axe-core could not be
  installed in the build environment, so this is not a full WCAG audit.
- Home tile corrected from 98 to 81 tools; the site check now keeps every home count equal to its directory.

What was checked every round
- `automation/check_site.py` (209 pages: links, anchors, assets, titles, descriptions, sitemap, preserved text,
  script ids and links): green after every round.
- Screenshots at desktop and phone widths, no horizontal overflow, no script errors on the tested pages.

Left on purpose
- Unused CSS rules: an automatic scan found 65 candidates (3.6 KB), but most are classes that scripts build at
  run time ("k-" + kind, "rxm" + number). Removing them would break tools for a 2 % saving, so they stay.
- The 37 `!important` outside print sit in older rules; each one needs a look at the page it serves.
