# MagChess (nFactorial Incubator 2026)

A competitive chess platform I built for players who want more than just a board. MagChess combines real ELO ratings, stake wagering, AI-powered post-game coaching, and live audio commentary - all in one place. Whether you're grinding ranked games against Stockfish or challenging a friend with coins on the line, there's always something at stake.

---

## How This Program Works

Full walkthrough: [https://youtu.be/tf7OXDepd64](https://youtu.be/tf7OXDepd64)

**Testing the Platform**

Core flow

- Sign up at `/signup` - choose a username, country, and city. You start with 50 free coins.
- Play vs AI at `/game` - select Bullet/Blitz/Rapid, pick AI difficulty (1000–2500 ELO), click "Play vs Computer". Enable the Commentary toggle for audio narration during the game.
- After the game, AI Coach appears - wait 3-5 seconds, click "Analyze Game" for your free analysis. View blunders, mistakes, and replay the game with the eval bar.
- Play vs Player - select "vs Player", choose a stake amount, click "Find Opponent". Open two browser tabs with different accounts to test matchmaking.
- Leaderboard at `/leaderboard` - switch between Global and My City views.
- Store at `/store` - buy coins with Stripe test card, purchase AI Coach or board themes.
- Profile at `/profile` - view rating chart, game history, and earned badges.

---

## Uniqueness from other platforms

- AI Coach Analysis - Choose the particular game, click on "Analyze game", get full analysis of each move with evaluation bar
- Chess Podcast Mode - While playing versus Computer, there is an audio-commentary (that you can turn off) via Web Speech API
- Location Rank System - Each user is ranked by rating globally (among other users across the globe) and locally (among other users across the city)
- Stake System - Before playing against another player, user can set up the stake (10 coins; 20 coins; 50 coins and so on ...). The winner gets all the coins decreased by 10% (fee)

---

## Tech Stack

| Area | Stack |
|---|---|
| Framework | Next.js 15 (App Router) · TypeScript · Tailwind CSS |
| Chess | chess.js · react-chessboard |
| Engine | Stockfish 18 (WASM — browser + Node.js) |
| State | Zustand |
| Database & Auth | Supabase (PostgreSQL · Auth · Realtime) |
| Payments | Stripe |
| Audio | Web Speech API |
| Deployment | Vercel |

---

## Prerequisites

- Node.js 18+
- Supabase project
- Stripe account (test mode is fine)
- Vercel account for deployment

---

## How to Setup Locally

**1. Clone and install**

```bash
git clone https://github.com/juliuscaesar100usd/magchess.git
cd magchess
npm install
```

**2. Set up environment variables**

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**3. Set up the database**

Go to your Supabase project → SQL Editor, paste the contents of `supabase/schema.sql`, and run it. This creates all tables, triggers, RLS policies, and helper functions.

**4. Configure Supabase Auth**

In your Supabase dashboard → Authentication → Settings:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

**5. Set up Stripe webhook (local)**

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the signing secret it outputs and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

**6. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Stripe test card**

```
Number:  4242 4242 4242 4242
Expiry:  Any future date
CVC:     Any 3 digits
```

**Deploying to Vercel**

Push to GitHub, import the repo in Vercel, add all environment variables from `.env.local`, then deploy. After deploying, go back to Supabase → Auth settings and update the Site URL and Redirect URLs to your Vercel domain. Add a Stripe webhook pointing to `https://your-domain.vercel.app/api/webhooks/stripe` with the `payment_intent.succeeded` event, copy the signing secret, and update `STRIPE_WEBHOOK_SECRET` in Vercel.

---

## Project Structure

```
magchess/
├── app/
│   ├── (auth)/                 # Login and signup pages
│   ├── (main)/
│   │   ├── game/               # Lobby, active board, game review
│   │   ├── leaderboard/        # Global and city rankings
│   │   ├── profile/            # Own profile + public user profiles
│   │   └── store/              # Coin packages and item purchases
│   ├── api/
│   │   ├── auth/signup/        # Admin signup (email rate limit fallback)
│   │   ├── coach/analyze/      # Stockfish post-game analysis (Node.js)
│   │   ├── game/               # Create, end, save-streak routes
│   │   ├── store/              # Buy items, Stripe checkout
│   │   └── webhooks/stripe/    # Credit coins on payment success
│   └── auth/callback/          # Supabase PKCE callback
├── components/
│   ├── board/                  # ChessBoard, Timer, EvalBar, MoveHistory
│   ├── coach/                  # CoachPanel, BlunderCard
│   ├── game/                   # GameLobby, StakeSelector, PodcastToggle
│   └── ui/                     # Navbar, Modal, Button, CoinBalance
├── hooks/                      # useGameTimer, useRealtimeGame, usePodcast
├── lib/
│   ├── chess/                  # ELO logic, time controls, board themes
│   ├── commentary/             # Audio commentary templates
│   ├── realtime/               # Supabase broadcast channels
│   ├── stockfish/              # Engine wrapper, skill map, evaluator
│   ├── stripe/                 # Payment helpers
│   └── supabase/               # Client and server Supabase instances
├── store/                      # Zustand stores (auth, game, settings)
├── supabase/schema.sql         # Full database schema
├── types/                      # TypeScript types
└── scripts/copy-stockfish.mjs  # Postinstall — copies WASM to /public
```

---

## Notes

- AI Coach analysis runs Stockfish at depth 14, staying within Vercel's free plan 60-second function timeout.
- Stockfish WASM requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers - configured in `next.config.mjs`.
- All coin mutations use a PostgreSQL `SELECT FOR UPDATE` RPC to prevent race conditions.
- The Podcast Mode uses the browser's Web Speech API (best in Chrome, Edge, Safari).
- The first AI Coach analysis per user is free. Subsequent uses require either purchasing AI Coach (500 coins) in the Store.
