<<<<<<< HEAD
#  AI Investment Research Agent

> Enter a company name → the agent researches it → get a data-backed **INVEST or PASS** decision in ~15 seconds.

**Live demo:** https://ai-investment-agent.vercel.app *(replace with your URL after deploying)*

---

## Overview

An AI agent built with **LangGraph.js + Next.js** that autonomously researches any company and makes a structured investment decision. The agent runs 3 parallel web searches, feeds all data to GPT-4o-mini, and returns a clean verdict with score, summary, key metrics, and detailed reasoning.

**What it produces:**
- **INVEST** or  **PASS** verdict
- Score out of 10 (with visual progress bar)
- 2–3 sentence executive summary
- 4 specific reasoning points
- Key metrics: Revenue Growth, Market Position, Risk Level, Competitive Moat

---

## How to Run

### 1. Clone and install
```bash
git clone <your-repo-url>
cd ai-investment-agent
npm install
```

### 2. Set up API keys
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
OPENAI_API_KEY=sk-...          # https://platform.openai.com/api-keys
TAVILY_API_KEY=tvly-...        # https://app.tavily.com (free: 1000 req/month)
```

### 3. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

### 4. Build for production
```bash
npm run build
npm start
```

---

## How It Works — Architecture

### Tech Stack
| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js (React) | Full-stack in one repo, easy Vercel deploy |
| Backend | Next.js API Routes | No separate server needed |
| AI Orchestration | **LangGraph.js** | Graph-based agent state machine |
| LLM | **GPT-4o-mini** (LangChain) | Fast, cheap, excellent JSON output |
| Search | **Tavily** (LangChain) | Purpose-built for AI agents, clean results |
| Styling | Tailwind CSS | Fast utility-first styling |

### Agent Flow

```
User inputs company name
          │
          ▼
  ┌───────────────┐
  │   [research]  │  ── 3 parallel Tavily web searches
  │   Node 1      │     • Financial performance & earnings
  └───────┬───────┘     • Market cap, growth, investment analysis
          │              • Recent news & strategy
          ▼
  ┌───────────────┐
  │   [decide]    │  ── GPT-4o-mini reads all research
  │   Node 2      │     returns structured JSON decision
  └───────┬───────┘
          │
          ▼
     JSON result → Next.js API → React UI
```

### LangGraph State Machine

The agent is defined as a `StateGraph`. State is a typed object that flows between nodes:

```typescript
// State shape — every node reads & updates these fields
{
  company:    string,           // input
  research:   string,           // set by Node 1
  verdict:    "INVEST" | "PASS", // set by Node 2
  score:      number,           // set by Node 2
  summary:    string,           // set by Node 2
  reasons:    string[],         // set by Node 2
  keyMetrics: Record<string, string>  // set by Node 2
}
```

**Node 1 — `research`:** Uses `Promise.all` to run 3 Tavily searches concurrently (saves ~6s vs sequential). Returns a combined research string into state.

**Node 2 — `decide`:** Sends a strict system prompt to GPT-4o-mini instructing it to return *only* a JSON object. Regex-extracts the JSON from the response for safety, then parses and returns the decision fields.

**Graph definition (the key LangGraph part):**
```typescript
const graph = new StateGraph(AgentState)
  .addNode("research", researchNode)
  .addNode("decide",   decideNode)
  .addEdge(START,      "research")
  .addEdge("research", "decide")
  .addEdge("decide",   END)
  .compile();

// Run it:
const result = await graph.invoke({ company: "Apple" });
```

---

## Key Decisions & Trade-offs

### What I chose and why

**1. LangGraph over plain LangChain**
LangGraph lets you define agents as explicit state machines (nodes + edges). This is easier to reason about, test, and extend vs chaining calls manually. For an interview: *"LangGraph is like a Redux reducer for agents — the state flows through defined nodes."*

**2. 2-node linear graph (not a ReAct loop)**
A simple linear graph is sufficient for this task and is predictable, fast (~10–15s), and easy to debug. A ReAct loop (where the agent decides what tool to call next) would add latency and unpredictability for no gain here.

**3. Parallel search with `Promise.all`**
Running 3 searches in parallel cuts latency from ~9s to ~3s. The 3 queries are intentionally distinct — financials, market analysis, recent news — so they don't return overlapping results.

**4. GPT-4o-mini over GPT-4o**
10x cheaper, 3x faster, and sufficient for structured JSON extraction from web data. For complex reasoning tasks, GPT-4o would be better.

**5. Tavily over SerpAPI / Google Search**
Tavily is purpose-built for AI agents — it returns clean, extracted text rather than raw HTML. This directly reduces token costs and LLM parsing work.

**6. JSON regex extraction as a safety net**
The LLM is prompted to return pure JSON, but LLMs sometimes wrap it in markdown. The regex `/\{[\s\S]*\}/` extracts the JSON block regardless of wrapping, making parsing robust.

### What I left out and why

| Left out | Why |
|----------|-----|
| Streaming responses | Adds complexity; showing animated step messages fakes progress sufficiently |
| Financial API (e.g. Alpha Vantage) | Adds another API key, Tavily covers the data sufficiently |
| ReAct agent | Overkill for this linear flow; adds latency and unpredictability |
| Historical comparison | Would require a database; out of scope for this assignment |
| Auth / rate limiting | Not needed for demo; add before production |
| Caching results | Good for cost saving; would use Redis in production |

---

## Example Runs

### 1. Apple Inc.
```
Company: Apple Inc.
Verdict: INVEST  |  Score: 9/10

Summary:
Apple maintains exceptional business quality through its powerful ecosystem and rapidly
growing services segment ($96B revenue, growing 14% YoY). With $73B net cash, $90B in
annual buybacks, and expanding AI capabilities via Apple Intelligence, Apple is a
compelling long-term holding.

Key Metrics:
  Revenue Growth    → 5–8% YoY; Services at 14% YoY
  Market Position   → #1 premium smartphone globally, ~55% US smartphone share
  Risk Level        → Low — diversified revenue, loyal installed base
  Competitive Moat  → Strong — 1B+ active devices, App Store ecosystem lock-in

Analysis:
  1. Services revenue exceeds $96B annually with high margins, growing faster than hardware
  2. 1B+ active device users create recurring revenue and ecosystem stickiness
  3. $90B+ in annual share buybacks consistently return value to shareholders
  4. Apple Intelligence and Vision Pro position the company for the next platform shift
```

### 2. Zomato
```
Company: Zomato
Verdict: INVEST  |  Score: 7/10

Summary:
Zomato achieved its first full year of profitability in 2024, validating its business model.
Blinkit (quick commerce) is growing 100%+ YoY and is on track for 1,000 dark stores.
As India's food delivery leader in a massively underpenetrated market, it offers compelling
long-term upside with manageable execution risk.

Key Metrics:
  Revenue Growth    → 70%+ YoY (FY2024)
  Market Position   → #1 food delivery India, ~55% market share
  Risk Level        → Medium — high competition in quick commerce; execution risk
  Competitive Moat  → Moderate — strong brand + network effects in India

Analysis:
  1. First profitable year in FY2024 — validated unit economics at scale
  2. Blinkit growing 100%+ YoY with expansion to 1,000+ dark stores by FY2025
  3. India food delivery penetration is ~4% vs 20%+ in mature markets — large runway
  4. Consistently outperforming Swiggy on product quality and driver supply
```

### 3. Paytm (One97 Communications)
```
Company: Paytm
Verdict: PASS  |  Score: 3/10

Summary:
Paytm faces significant existential challenges after RBI actions disrupted its core payments
bank business. With declining market share in UPI, persistent losses over 10+ years, and
intensifying competition from PhonePe and Google Pay, the risk-reward is unfavorable.

Key Metrics:
  Revenue Growth    → Declining YoY post-RBI restrictions
  Market Position   → #3 UPI player with falling market share (~9%)
  Risk Level        → High — regulatory uncertainty + competitive headwinds
  Competitive Moat  → Weak — no sustainable differentiation vs PhonePe/Google Pay

Analysis:
  1. RBI's action on Paytm Payments Bank severely disrupted core lending and payment flows
  2. UPI market share declining — PhonePe + Google Pay now control 80%+ of transactions
  3. Company has reported losses every year since inception, no clear profitability timeline
  4. Management credibility impacted; uncertainty around regulatory position ongoing
```

---

## What I Would Improve With More Time

1. **Streaming UI** — Stream LLM tokens to the frontend using Vercel AI SDK for faster perceived response time
2. **Sectoral context** — Add a tool that fetches industry benchmarks (P/E ratios, sector growth rates) for relative comparison
3. **Financial data API** — Integrate Alpha Vantage or Yahoo Finance for precise revenue/EPS numbers instead of relying on search
4. **Conditional LangGraph edges** — If Tavily returns insufficient data (e.g. very obscure company), route to a "retry with different queries" node
5. **Result caching** — Cache results by company name for 24 hours using Redis to reduce API costs
6. **Comparison mode** — Allow comparing two companies side-by-side
7. **Confidence indicator** — Distinguish between "high confidence INVEST" vs "borderline INVEST" based on data quality

---

## BONUS: LLM Chat Session Transcript

Below is the transcript of my conversation with Claude while building this project.

---

**Me:**  
I need to build an AI Investment Research Agent for an internship assignment. Tech stack: React/Next.js, LangChain.js, LangGraph.js. It should take a company name, research it, and output invest or pass. How should I architect this?

**Claude:**  
For a clean, explainable architecture I'd go with a **2-node LangGraph StateGraph**: a `research` node that runs Tavily searches, and a `decide` node that passes the research to an LLM for a structured decision. Linear graph (not a ReAct loop) keeps it fast and predictable. Here's the flow:

```
START → [research node] → [decide node] → END
```

State shape:
```typescript
{ company, research, verdict, score, summary, reasons, keyMetrics }
```

Use `Promise.all` in the research node to run 3 searches in parallel — you'll save ~6 seconds.

---

**Me:**  
How do I define the LangGraph state and nodes in TypeScript?

**Claude:**  
Use `Annotation.Root` to define the state schema. Each field needs a reducer — for this use case, "last write wins" works for all fields:

```typescript
const AgentState = Annotation.Root({
  company:  Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  research: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  verdict:  Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  // ... etc
});

type State = typeof AgentState.State;
```

Node functions take the full state and return only the fields they update:
```typescript
async function researchNode(state: State): Promise<Partial<State>> {
  const [r1, r2, r3] = await Promise.all([search.invoke(q1), ...]);
  return { research: combine(r1, r2, r3) };
}
```

---

**Me:**  
What's the best way to make sure the LLM returns valid JSON consistently?

**Claude:**  
Two things: (1) a strict system prompt that says "respond with ONLY a JSON object, no markdown, no explanation", and (2) a regex fallback to extract the JSON block even if the LLM wraps it in backticks. Here's the pattern:

```typescript
const text = response.content as string;
const jsonMatch = text.match(/\{[\s\S]*\}/);  // extract JSON block safely
if (!jsonMatch) throw new Error("Invalid LLM response");
const parsed = JSON.parse(jsonMatch[0]);
```

Also set `temperature: 0.1` — lower temperature makes the LLM more predictable and format-consistent.

---

**Me:**  
How do I connect the agent to a Next.js API route?

**Claude:**  
In Next.js App Router, just export a `POST` function from `app/api/research/route.ts`. Add `export const maxDuration = 60` at the top for Vercel (so the function doesn't time out during long research tasks):

```typescript
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { company } = await req.json();
  const result = await runInvestmentAgent(company);
  return NextResponse.json(result);
}
```

---

**Me:**  
The UI should show what step the agent is on while loading. How?

**Claude:**  
Since you're not streaming, you can fake progress with `setInterval` cycling through step messages. This gives good UX without adding streaming complexity:

```typescript
const STEPS = [ Searching...", "Analyzing...", "Deciding..."];
useEffect(() => {
  if (!loading) return;
  const id = setInterval(() => setStep(i => (i + 1) % STEPS.length), 2000);
  return () => clearInterval(id);
}, [loading]);
```

---

**Me:**  
How should I deploy to Vercel?

**Claude:**  
Push to GitHub, connect the repo to Vercel, and add your environment variables in the Vercel dashboard (Settings → Environment Variables). Set `OPENAI_API_KEY` and `TAVILY_API_KEY`. Vercel auto-detects Next.js — no additional config needed.

---

*This transcript represents the key decision points in my development process. AI assistance accelerated architecture design, API integration, and debugging — I was able to explain and justify every decision made.*
=======
# AI-invest-
>>>>>>> 6657d1d98a0ec768def726cdc20b188963ad1752
