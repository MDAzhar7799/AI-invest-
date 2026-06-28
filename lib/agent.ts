/**
 * AI Investment Research Agent — lib/agent.ts
 *
 * HOW IT WORKS (for interviews):
 * ─────────────────────────────────────────────────────────────────────────────
 * This uses LangGraph to create a "state machine" with 2 nodes:
 *
 *   [START] ──► [research] ──► [decide] ──► [END]
 *
 * State is an object that flows through each node. Each node reads the state,
 * does its work, and returns only the fields it updated.
 *
 * Node 1 — research:  Runs 3 parallel Tavily web searches to gather data.
 * Node 2 — decide:    GPT-4o reads the research and returns a JSON decision.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// ─── 1. STATE ─────────────────────────────────────────────────────────────────
// LangGraph needs a typed state definition.
// Annotation.Root creates the schema; each field uses "last write wins" reducer.
// Interview explanation: "This is the shared memory that flows between nodes."

const AgentState = Annotation.Root({
  company:    Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  research:   Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  verdict:    Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  score:      Annotation<number>({ reducer: (x, y) => y ?? x, default: () => 0 }),
  reasons:    Annotation<string[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
  summary:    Annotation<string>({ reducer: (x, y) => y ?? x, default: () => "" }),
  keyMetrics: Annotation<Record<string, string>>({ reducer: (x, y) => y ?? x, default: () => ({}) }),
});

// TypeScript helper — infer the State type from the annotation
type State = typeof AgentState.State;

// ─── 2. TOOLS & LLM ──────────────────────────────────────────────────────────
// GPT-4o-mini: fast and cheap, perfect for structured JSON outputs.
// Tavily: a search engine purpose-built for AI agents — returns clean text.

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.1,           // Low temp = consistent, factual answers
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const search = new TavilySearchResults({
  maxResults: 5,
  apiKey: process.env.TAVILY_API_KEY,
});

// ─── 3. NODE 1: RESEARCH ──────────────────────────────────────────────────────
// Runs 3 web searches IN PARALLEL (Promise.all) for speed.
// Returns the combined research text into state.research.

async function researchNode(state: State): Promise<Partial<State>> {
  const { company } = state;

  // Three targeted queries for comprehensive coverage
  const [financials, market, news] = await Promise.all([
    search.invoke(`${company} revenue profit financial results 2024 2025 annual report`),
    search.invoke(`${company} market cap stock analysis investment thesis growth prospects`),
    search.invoke(`${company} recent news CEO strategy competitive position risks`),
  ]);

  // Combine all search results into one string for the LLM
  const research = [
    `=== FINANCIALS & EARNINGS ===\n${financials}`,
    `=== MARKET & INVESTMENT ANALYSIS ===\n${market}`,
    `=== RECENT NEWS & STRATEGY ===\n${news}`,
  ].join("\n\n---\n\n");

  return { research };
}

// ─── 4. NODE 2: DECIDE ────────────────────────────────────────────────────────
// The LLM reads the research and returns a structured JSON decision.
// We use a strict system prompt to enforce JSON-only output.

const DECISION_PROMPT = `You are a senior investment analyst at a top-tier hedge fund.
Analyze the provided research and make a clear, data-backed investment decision.

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no explanation, just raw JSON.

{
  "verdict": "INVEST" or "PASS",
  "score": <integer 1-10, where 1=strong sell, 10=strong buy>,
  "summary": "<2-3 sentence executive summary of your thesis>",
  "reasons": [
    "<specific reason 1 with data>",
    "<specific reason 2 with data>",
    "<specific reason 3 with data>",
    "<specific reason 4 with data>"
  ],
  "keyMetrics": {
    "Revenue Growth": "<assessment with numbers if available>",
    "Market Position": "<brief competitive position>",
    "Risk Level": "Low | Medium | High",
    "Competitive Moat": "Strong | Moderate | Weak"
  }
}

Scoring: 8-10=Strong Buy, 6-7=Buy, 4-5=Hold, 1-3=Sell
Verdict rule: score >= 7 → INVEST, score < 7 → PASS`;

async function decideNode(state: State): Promise<Partial<State>> {
  const response = await llm.invoke([
    new SystemMessage(DECISION_PROMPT),
    new HumanMessage(
      `Company: ${state.company}\n\nResearch Data:\n${state.research}`
    ),
  ]);

  const text = response.content as string;

  // Extract the JSON block (handles edge cases where LLM adds extra text)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM returned invalid JSON");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    verdict:    parsed.verdict,
    score:      parsed.score,
    summary:    parsed.summary,
    reasons:    parsed.reasons || [],
    keyMetrics: parsed.keyMetrics || {},
  };
}

// ─── 5. BUILD THE GRAPH ───────────────────────────────────────────────────────
// Linear graph: START → research → decide → END
// .compile() validates the graph and returns a runnable executor.
// Interview explanation: "Like a pipeline — each step feeds into the next."

const graph = new StateGraph(AgentState)
  .addNode("research", researchNode)
  .addNode("decide",   decideNode)
  .addEdge(START,      "research")
  .addEdge("research", "decide")
  .addEdge("decide",   END)
  .compile();

// ─── 6. PUBLIC EXPORT ─────────────────────────────────────────────────────────

export type InvestmentResult = {
  company:    string;
  verdict:    string;
  score:      number;
  summary:    string;
  reasons:    string[];
  keyMetrics: Record<string, string>;
};

export async function runInvestmentAgent(company: string): Promise<InvestmentResult> {
  const result = await graph.invoke({ company });

  return {
    company:    result.company,
    verdict:    result.verdict,
    score:      result.score,
    summary:    result.summary,
    reasons:    result.reasons,
    keyMetrics: result.keyMetrics,
  };
}
