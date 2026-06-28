/**
 * API Route: POST /api/research
 *
 * This is a Next.js App Router route handler.
 * It receives a company name, runs the LangGraph agent, and returns the result.
 *
 * Interview explanation:
 * "Next.js App Router lets us define backend endpoints in the same repo.
 *  This file exports a POST function — Next.js maps it to POST /api/research."
 */

import { NextRequest, NextResponse } from "next/server";
import { runInvestmentAgent } from "@/lib/agent";

// Tell Vercel this route can run for up to 60 seconds (research takes time)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Read company name from request body
    const { company } = await req.json();

    // 2. Validate input
    if (!company?.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // 3. Run the LangGraph agent
    const result = await runInvestmentAgent(company.trim());

    // 4. Return the result
    return NextResponse.json(result);

  } catch (error) {
    console.error("[Investment Agent Error]", error);
    return NextResponse.json(
      { error: "Research failed. Check API keys and try again." },
      { status: 500 }
    );
  }
}
