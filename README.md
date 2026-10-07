# Pitboss

A small, fast web app that teaches **Hi-Lo card counting** for blackjack through short, replayable drills. Rounds last 30–90 seconds, restart with one key, and get faster as you get better.

Everything runs in the browser. There's no backend and no account, and it makes no network requests after the page loads. Progress is saved to `localStorage` on your device.

> Pitboss is an educational tool, not gambling advice. Counting cards is legal, but casinos are private businesses and may refuse service to players they suspect of counting.

## What's inside

| Mode                   | What it trains                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Card Values**    | Tag each card +1 / 0 / −1 before its timer runs out.                                                                                                                  |
| **2 · Running Count**  | Cards flash by one at a time; enter the total.                                                                                                                        |
| **3 · Pairs & Chunks** | Cards arrive in twos and threes, so you learn to cancel +1/−1 pairs.                                                                                                  |
| **4 · Full Deck**      | Count all 52 cards. There are two checkpoints along the way, and the final count must be 0. Get every checkpoint right for a **clean deck**, timed as your benchmark. |
| **5 · True Count**     | Divide the running count by decks remaining, estimated from a discard tray. Later questions flash cards first.                                                        |
| **6 · Table Play**     | A six-deck table with a dealer and 1–5 players. Count in the background; the game pauses at random to check your running or true count.                               |
| **Daily Deck**         | A seeded 52-card deck that's the same for everyone on a given UTC day, dealt at a fixed rising pace with four checkpoints. One scored attempt per day.                |

The game feel comes from these systems:

- **Streaks and combos.** The multiplier rises at streaks of 5, 10 and 20, and the meter shatters when a streak breaks.
- **Adaptive speed.** Speed is shown as cards per second. It rises while you're accurate and eases off after a miss.
- **XP and levels.** Levels unlock card backs, felt colors, accent themes, and Distractions mode (table chatter, screen jitter, and extra cards at the edges that still count).
- **Stats.** Accuracy and speed charts, best streak, fastest clean deck, and a daily streak.
- **Sound.** Optional sound effects synthesized with Web Audio. They're off by default and toggled in the header.
- **Reduced motion.** `prefers-reduced-motion` is respected, and Settings has an override. Large motion becomes short fades.
- **Keyboard, touch and screen readers.** Everything works from the keyboard or by touch; press `?` for shortcuts. Screen-reader mode announces each card.

## How Hi-Lo works

1. **Tag every card.** 2–6 count **+1**, 7–9 count **0**, and 10/J/Q/K/A count **−1**. A full deck sums to exactly 0.
2. **Keep a running count.** Start at 0 after the shuffle and add each card's tag as it's exposed, including the dealer's hole card when it flips.
3. **Convert to a true count.** Divide the running count by the number of decks still in the shoe. For example, +6 with 2 decks left gives a true count of +3. The higher the true count, the better the remaining cards are for the player. By default Pitboss rounds the true count toward zero (+2.8 becomes +2 and −2.8 becomes −2). Settings also offers floor and round-to-nearest.

## Local development

You need Node 20.19+, 22.13+, or 24+ (CI uses Node 24).

```bash
npm install
npm run dev       # start the dev server at http://localhost:5173
npm test          # run the Vitest unit tests (pure logic + storage)
npm run lint      # ESLint + Prettier check
npm run format    # apply Prettier formatting
npm run build     # type-check and build to dist/
npm run preview   # serve the production build locally
```

In dev mode, `#/lab` opens a playground for the card art and animations. It isn't included in production builds.

### Project layout

```
src/
  logic/       Pure, framework-free game logic, all unit-tested:
               seeded RNG, cards, shoe, count math, scoring, difficulty,
               progression, stats, FSM, blackjack table simulation
  modes/       One controller per drill, plugged into a shared drill shell
  ui/          DOM helper, router, header, numpad, chart, SVG card renderer, screens
  animations/  WAAPI helpers (deal, flip, sweep, riffle shuffle, pop, bursts),
               all with a reduced-motion fallback
  audio/       Web Audio sound effects (synthesized, no files)
  storage/     Versioned localStorage store with migrations and safe fallbacks
  styles/      Design tokens (CSS variables) and component styles
```

There's no UI framework and no animation library. Card faces and backs are drawn as SVG in code, and the only runtime dependencies are two self-hosted font packages.

## Deploying to GitHub Pages

The repository includes [.github/workflows/deploy.yml](.github/workflows/deploy.yml). On every push to `main` it lints, runs the tests, builds, and deploys to GitHub Pages.

1. Create a GitHub repository and push this code to its `main` branch:
   ```bash
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```
2. In the repository, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Under **Custom domain**, enter `pitboss.ajmastrangelo.dev`, save, and turn on **Enforce HTTPS** once the certificate is issued. At your DNS provider, the `pitboss` subdomain needs a `CNAME` record pointing to `<you>.github.io`.
4. Push to `main`, or run the workflow manually from the **Actions** tab. The site is published at `https://pitboss.ajmastrangelo.dev/`.

No `CNAME` file is needed in the repo: with Actions-based deployment, GitHub uses the domain set in the Pages settings and ignores that file.

### Base path

Vite's `base` is read from the `VITE_BASE` environment variable. The site is served from the root of its custom domain, so the workflow sets `VITE_BASE: /`.

If you deploy without a custom domain, the site is served from a subpath (`https://<you>.github.io/<repo>/`). In that case set `VITE_BASE` in the workflow to `/${{ github.event.repository.name }}/`.

To test a subpath build locally:

```bash
VITE_BASE=/pitboss/ npm run build
VITE_BASE=/pitboss/ npm run preview   # open http://localhost:4173/pitboss/
```

Routing uses the URL hash (`#/play/running`), so deep links work on Pages without a 404 fallback page.

## Privacy

There are no cookies, no analytics, and no third-party requests; fonts are bundled. To clear your data, use **Settings → Reset all progress**, or clear this site's storage in your browser.
