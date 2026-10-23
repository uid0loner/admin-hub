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
