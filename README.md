# MagChess ♟️

A modern, full-featured chess platform combining competitive mechanics, AI gameplay, social features, and monetization.

## Features

- **Play vs AI** — Stockfish WASM at 16 difficulty levels (1000–2500 ELO)
- **Play vs Player** — Realtime PvP via Supabase Realtime WebSockets
- **ELO Rating System** — chess.com-style K-factor ratings with full history
- **City Leaderboards** — global + per-city rankings with shareable badges
- **Stake Chess** — wager virtual coins on games (10% platform fee)
- **Chess Podcast Mode** — real-time audio commentary using Web Speech API
- **AI Coach** — post-game analysis by Stockfish (depth 14), blunder/mistake detection
- **Streak System** — win streaks with milestone badges; save streak for 10 coins
- **Store** — buy coins via Stripe, unlock AI Coach (500 coins), buy board themes (300 coins each)
- **4 Board Themes** — Classic Wood, Dark Wood, Neon Night, Marble

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State | Zustand |
| Chess logic | chess.js |
| Board UI | react-chessboard |
| AI Engine | Stockfish 18 (WASM in browser, Node.js for analysis) |
| Backend/DB/Auth | Supabase (PostgreSQL + Auth + Realtime) |
| Payments | Stripe |
| Audio | Web Speech API |
| Deployment | Vercel |

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (test mode is fine)
- A [Vercel](https://vercel.com) account for deployment

## Local Development

### 1. Clone and install

```bash
git clone <your-repo-url>
cd magchess
npm install
```

### 2. Set up environment variables

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

### 3. Set up Supabase database

1. Go to your Supabase project → **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Paste and run it

This creates all tables, triggers, RLS policies, and helper functions.

### 4. Configure Supabase Auth

In your Supabase dashboard:
- Go to **Authentication → Settings**
- Set **Site URL** to `http://localhost:3000`
- Add `http://localhost:3000/**` to **Redirect URLs**

### 5. Set up Stripe webhook (local)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret it outputs and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing the Platform

### Core flow

1. **Sign up** at `/signup` — choose a username, country, and city. You start with **50 free coins**.
2. **Play vs AI** at `/game` — select Bullet/Blitz/Rapid, pick AI difficulty (1000–2500 ELO), click "Play vs Computer". Enable the **Commentary** toggle for audio narration during the game.
3. After the game, **AI Coach** appears — click "Analyze Game" for your free analysis. View blunders, mistakes, and replay the game with the eval bar.
4. **Play vs Player** — select "vs Player", choose a stake amount, click "Find Opponent". Open two browser tabs with different accounts to test matchmaking.
5. **Leaderboard** at `/leaderboard` — switch between Global and My City views.
6. **Store** at `/store` — buy coins with Stripe test card, purchase AI Coach or board themes.
7. **Profile** at `/profile` — view rating chart, game history, and earned badges.

### Stripe test card

```
Card number: 4242 4242 4242 4242
Expiry:      Any future date (e.g. 12/34)
CVC:         Any 3 digits
```

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial MagChess build"
git remote add origin https://github.com/your-username/magchess.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repository
2. In **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Set after step 4 |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL (e.g. `https://magchess.vercel.app`) |

3. Click **Deploy**

### 3. Configure Supabase for production

In your Supabase dashboard → **Authentication → Settings**:
- **Site URL**: `https://your-vercel-url.vercel.app`
- **Redirect URLs**: `https://your-vercel-url.vercel.app/**`

### 4. Configure Stripe webhook for production

1. Stripe Dashboard → **Webhooks** → **Add endpoint**
2. URL: `https://your-vercel-url.vercel.app/api/webhooks/stripe`
3. Select event: `payment_intent.succeeded`
4. Copy the **Signing secret** → update `STRIPE_WEBHOOK_SECRET` in Vercel and redeploy

## Project Structure

```
magchess/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login + signup (unauthenticated)
│   ├── (main)/            # Main app (requires auth)
│   │   ├── game/          # Game lobby + active board
│   │   ├── leaderboard/   # Rankings
│   │   ├── profile/       # Own + public profiles
│   │   └── store/         # Coin + item purchases
│   └── api/               # Server-side API routes
├── components/             # React components
│   ├── board/             # Chess board, timers, eval bar
│   ├── coach/             # AI Coach analysis UI
│   ├── game/              # Lobby, stake selector, podcast toggle
│   └── ui/                # Shared UI (Navbar, Modal, Button…)
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and integrations
│   ├── chess/             # ELO, time controls, board themes
│   ├── stockfish/         # Engine wrapper, skill map
│   ├── commentary/        # Audio commentary templates
│   ├── realtime/          # Supabase realtime channels
│   └── stripe/            # Payment integration
├── store/                  # Zustand stores
├── supabase/               # Database schema SQL
└── types/                  # TypeScript type definitions
```

## Notes

- **AI Coach** analysis runs Stockfish at depth 14, staying within Vercel's free plan 60-second function timeout.
- Stockfish WASM requires `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers — configured in `next.config.mjs`.
- All coin mutations use a PostgreSQL `SELECT FOR UPDATE` RPC to prevent race conditions.
- The **Podcast Mode** uses the browser's Web Speech API (best in Chrome, Edge, Safari).
- The first AI Coach analysis per user is **free**. Subsequent uses require either purchasing AI Coach (500 coins) in the Store.
