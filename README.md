# Fusion

**Multi-AI Response Comparator & Answer Synthesizer**

Fusion queries multiple AI models simultaneously (GPT-4o, Claude 3.5 Sonnet, Gemini 2.5 Pro, Llama 3), scores their responses across quality dimensions, and synthesizes the best answer — all in a single, elegant interface.

## Features

- **Multi-Model Comparison** — Query 4 leading AI models at once and see side-by-side results
- **Intelligent Scoring** — Automatic evaluation across accuracy, reasoning, coherence, grounding, and hallucination risk
- **Answer Synthesis** — Fused answer that combines the strongest elements from all models
- **Performance Metrics** — Real-time quality, consensus, and variance analytics
- **Benchmark Visualization** — Interactive trend charts and model consensus bars
- **Task Profiles** — Optimized scoring for general, coding, research, reasoning, and creative tasks
- **Dark & Light Mode** — Warm amber-accented palette across both themes
- **Responsive Layout** — Adaptive split-panel design for desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js](https://nextjs.org/) 16.2.0 |
| **React** | 19.x |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 4.2.0 |
| **UI Components** | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Typography** | [Inter](https://rsms.me/inter/) via Google Fonts |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + Zod |
| **Charts** | [Recharts](https://recharts.org/) 2.15.0 |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Theme** | [next-themes](https://github.com/pacocoursey/next-themes) |
| **Language** | TypeScript 5.7.3 |

## Getting Started

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to use Fusion.

## Project Structure

```
fusion/
├── app/
│   ├── layout.tsx            # Root layout — Inter font, theme provider
│   ├── page.tsx              # Main page — sidebar + split panel layout
│   └── globals.css           # Design tokens — warm neutral + amber palette
├── components/
│   ├── ui/                   # Shadcn UI primitives (button, input, etc.)
│   ├── sidebar.tsx           # Collapsible navigation sidebar
│   ├── header.tsx            # Top bar — breadcrumbs, search, theme toggle
│   ├── input-area.tsx        # Prompt input, model pills, task selector
│   ├── stats-panel.tsx       # Metrics dashboard + fused answer display
│   └── theme-provider.tsx    # next-themes configuration
├── lib/
│   ├── engine.ts             # Multi-model comparison & scoring engine
│   └── utils.ts              # Utility helpers
├── hooks/                    # Custom React hooks
└── public/                   # Favicon & static assets
```

## How It Works

1. **Enter a prompt** in the input area on the left panel
2. **Select a task profile** (general, coding, research, reasoning, creative)
3. **Hit send** — Fusion queries all 4 models simultaneously
4. **View results** — The right panel shows:
   - Performance metrics (quality, consensus, variance)
   - Benchmark trend chart + consensus ranking
   - Synthesized fused answer
   - Raw responses from each model with individual scores

## Design

Fusion uses a warm neutral palette with amber/golden accents — deliberately avoiding the typical blue/purple "AI website" look. The design prioritizes readability, speed, and elegance.

- **Dark mode**: Deep charcoal with warm undertones
- **Light mode**: Warm cream/stone whites
- **Accent**: Amber/golden highlights

## License

MIT
Fusion is a Multi-AI Response Comparator and Answer Synthesizer.

It runs the same prompt across multiple models, scores each response with NLP-style heuristics, detects hallucination and bias signals, ranks models, and produces one fused answer.

## What This Project Does

- Compares responses from multiple providers: OpenAI, Anthropic, Gemini, Groq (Llama).
- Falls back to local simulated model responses if API keys are missing.
- Scores each model on quality dimensions:
	- accuracy
	- reasoning
	- coherence
	- completeness
	- safety
- Adds grounding, contradiction, hallucination-risk, and bias checks.
- Computes consensus between model responses.
- Produces a fused answer from top-ranked model outputs.
- Streams live progress using SSE.
- Saves run history to a local database file.
- Exports history as JSON or CSV.

## How Comparison Works

1. User submits prompt and task type.
2. Backend requests model responses.
3. Each response is scored.
4. Consensus and weighted overall scores are computed.
5. Models are ranked.
6. Best evidence from top models is fused into a synthesized answer.
7. Result is persisted in history.

Task types:

- general
- coding
- research
- reasoning
- creative

Task type changes scoring weights so, for example, coding prioritizes correctness and reasoning more than creative fluency.

## How Scoring Works

Core scoring dimensions:

- Accuracy: prompt coverage + semantic match + grounding quality.
- Reasoning: explicit logical structure and inference clarity.
- Coherence: readability and internal flow.
- Completeness: depth and coverage of requested scope.
- Safety: harmful content and risky framing penalties.

Additional checks:

- Semantic similarity: token/phrase overlap heuristics.
- Grounding score: penalizes unsupported claims.
- Contradiction detection: internal logical conflict heuristics.
- Hallucination risk: low, medium, high.
- Bias detection: heuristic signal across framing categories.
- Consensus score: agreement with peer model responses.

Overall score:

- Weighted sum of core dimensions (task-specific).
- Adjusted by consensus and contradiction penalties.

Confidence score:

- Uses average model quality, agreement, grounding, and variance.

## Live Streaming (SSE)

Fusion uses Server-Sent Events to stream progress in real time.

Stream events:

- status
- model_response
- model_score
- final
- error

This lets the UI render partial responses and scores before the final fused answer is ready.

## History and Export

- Every completed run is saved in data/history.json.
- History API returns recent runs for live dashboard UI.
- Export API provides downloadable JSON and CSV.

## Project Structure

- app/api/compare/route.ts
	- Standard non-stream compare endpoint.
- app/api/compare/stream/route.ts
	- SSE compare endpoint.
- app/api/history/route.ts
	- Fetch recent history entries.
- app/api/history/export/route.ts
	- Export history in JSON or CSV.
- lib/engine.ts
	- Scoring, ranking, consensus, and fusion logic.
- lib/server/model-clients.ts
	- Provider API adapters and fallback behavior.
- lib/server/compare-service.ts
	- Shared orchestration for compare pipeline.
- lib/server/history-db.ts
	- File-backed history persistence.

## API Reference

### POST /api/compare

Request:

```json
{
	"query": "Explain how binary search works and where it fails.",
	"taskType": "coding",
	"models": ["gpt4", "claude", "gemini", "llama"]
}
```

Response fields:

- query
- taskType
- responses
- scores
- ranking
- synthesizedAnswer
- topModel
- confidence
- benchmark

### POST /api/compare/stream

Request body is same shape as /api/compare.

Response is text/event-stream with incremental events.

### GET /api/history

Optional query param:

- limit, default 20

### GET /api/history/export

Query params:

- format=json
- format=csv

## Environment Variables

Configure any provider keys you have. Missing keys use fallback mode.

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=
```

## Local Development

```bash
npm install
npm run dev
```

Production check:

```bash
npm run build
npm start
```

## Deploy

### Vercel

1. Push code to GitHub.
2. Import repo in Vercel.
3. Add environment variables.
4. Deploy.

### Hugging Face Spaces (Docker)

1. Create a Docker Space.
2. Push this repository.
3. Add Space Secrets for API keys.
4. App runs on port 7860 via Dockerfile.

## Notes

- If editor shows CSS warnings for @apply, @theme, or @custom-variant, but npm run build passes, this is typically editor tooling mismatch rather than runtime failure.
- For multi-instance production environments, replace file history with a shared DB (for example Postgres).
