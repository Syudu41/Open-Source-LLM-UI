# LOpen-Source LLM UI 

A minimalist research lab chat interface for free open-source models via OpenRouter. No backend, no database, zero dependencies beyond the browser.

## Features

- **Dynamic Free Model Discovery** — Auto-fetches all available free models from OpenRouter's API in real-time. No hardcoded model lists.
- **Arena Mode** — Blind side-by-side model comparison. Pick two models (or randomize), send a prompt, vote on responses, then reveal identities.
- **Batch Prompt Runner** — Fire one prompt across multiple models simultaneously. Get a comparison table with latency and token counts. Export as CSV/JSON.
- **Prompt Library with Versioning** — Create, tag, fork, and version prompts locally. Every edit creates a new version. Export/import as JSON to share with lab members.
- **Ephemeral by Design** — Chat history lives in memory only. API keys live in session storage. Nothing is persisted unless you explicitly export.

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/labllm.git
cd labllm

# Install
npm install

# Dev
npm run dev

# Build for production
npm run build
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to Vercel for automatic deploys on push.

## Deploy to Netlify

```bash
npm run build
# Drag the `dist/` folder to Netlify's deploy page
```

## Usage

1. Open the app
2. Enter your OpenRouter API key ([get one here](https://openrouter.ai/keys))
3. Start chatting, comparing models, or building your prompt library

## Tech Stack

- **Vite** + **React 18** + **Tailwind CSS**
- **OpenRouter API** (OpenAI-compatible)
- Zero backend — pure static site
- Inter typeface

## Architecture

```
Browser ──→ OpenRouter API
   │
   ├── Chat (streaming, markdown, code highlighting)
   ├── Arena (parallel requests, blind voting)
   ├── Batch Runner (concurrent requests with rate limiting)
   └── Prompt Library (localStorage, JSON export/import)
```

No servers. No databases. No tracking. Just models.

## License

MIT

----
\copyright sbalaji