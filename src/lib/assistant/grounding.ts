import {
  runToolLoop,
  type AssistantTool,
  type ChatTurn,
} from "./provider";

// Every reply passes through here before it reaches the client. The check is
// arithmetic, not trust: money amounts and route codes in the reply must appear
// in this turn's tool results (or in what the traveller themselves typed, which
// the model cannot have invented). One retry names the exact unverified value;
// a second failure returns a fixed sentence instead of the reply.

export const UNAVAILABLE_REPLY = "Assistant unavailable. No API key set.";
export const UNVERIFIED_REPLY = "Could not verify that figure against stored data.";

export type GroundedResult =
  | { available: false; reply: string; toolLog: string[] }
  | { available: true; reply: string; toolLog: string[] };

// Two decimal places is the finest grain any stored price carries.
function norm(n: number): string {
  return String(Math.round(n * 100) / 100);
}

type Whitelist = { numbers: Set<string>; strings: Set<string> };

function addNumber(w: Whitelist, n: number) {
  if (!Number.isFinite(n)) return;
  w.numbers.add(norm(n));
  // The model may round a stored figure; a whole-unit rounding is not invention.
  w.numbers.add(String(Math.round(n)));
}

function collect(value: unknown, w: Whitelist) {
  if (typeof value === "number") {
    addNumber(w, value);
  } else if (typeof value === "string") {
    w.strings.add(value);
    for (const m of value.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
      addNumber(w, parseFloat(m.replace(/,/g, "")));
    }
  } else if (Array.isArray(value)) {
    for (const v of value) collect(v, w);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collect(v, w);
  }
}

function buildWhitelist(toolResults: unknown[], userTurns: ChatTurn[]): Whitelist {
  const w: Whitelist = { numbers: new Set(), strings: new Set() };
  for (const r of toolResults) collect(r, w);
  for (const t of userTurns) {
    if (t.role === "user") collect(t.content, w);
  }
  return w;
}

const MONEY_PATTERNS = [
  /[£$€₦]\s?(\d[\d,]*(?:\.\d+)?)/g,
  /\b(?:GBP|USD|EUR|NGN|CAD|AUD|JPY|CHF)\s?(\d[\d,]*(?:\.\d+)?)/g,
  /(\d[\d,]*(?:\.\d+)?)\s?(?:GBP|USD|EUR|NGN|CAD|AUD|JPY|CHF)\b/g,
];

// Tokens that look like IATA codes but are ordinary words or currency codes.
const NOT_ROUTE_CODES = new Set([
  "GBP", "USD", "EUR", "NGN", "CAD", "AUD", "JPY", "CHF",
  "EST", "THE", "AND", "FOR", "NOT", "YES", "ALL", "ANY", "PER", "NOW",
  "LOW", "TOP", "MAX", "MIN", "ADD", "ASK", "API", "FAQ", "VAT",
]);

export function unverifiedClaims(reply: string, w: Whitelist): string[] {
  const bad: string[] = [];

  for (const pattern of MONEY_PATTERNS) {
    for (const m of reply.matchAll(pattern)) {
      const raw = m[1];
      const value = norm(parseFloat(raw.replace(/,/g, "")));
      if (!w.numbers.has(value) && !bad.includes(m[0])) bad.push(m[0]);
    }
  }

  for (const m of reply.matchAll(/\b[A-Z]{3}\b/g)) {
    const code = m[0];
    if (NOT_ROUTE_CODES.has(code)) continue;
    const known =
      w.strings.has(code) || [...w.strings].some((s) => s.includes(code));
    if (!known && !bad.includes(code)) bad.push(code);
  }

  return bad;
}

export async function runGrounded(args: {
  system: string;
  turns: ChatTurn[];
  tools: AssistantTool[];
}): Promise<GroundedResult> {
  const first = await runToolLoop(args);
  if (!first.available) {
    return { available: false, reply: UNAVAILABLE_REPLY, toolLog: [] };
  }

  const w1 = buildWhitelist(first.toolResults, args.turns);
  const bad = unverifiedClaims(first.reply, w1);
  if (bad.length === 0) {
    return { available: true, reply: first.reply, toolLog: first.toolLog };
  }

  // One retry, naming the exact unverified values. The injected turns are kept
  // out of the whitelist so the correction cannot launder the bad figures.
  const retryTurns: ChatTurn[] = [
    ...args.turns,
    { role: "assistant", content: first.reply },
    {
      role: "user",
      content:
        `Your reply contained values not present in any tool output: ${bad.join(", ")}. ` +
        "State only figures and route codes that appear in tool results. " +
        "Look the data up again if you need to, or say plainly that it is not in the stored data.",
    },
  ];
  const second = await runToolLoop({ ...args, turns: retryTurns });
  const toolLog = [...first.toolLog, ...(second.available ? second.toolLog : [])];
  if (!second.available) {
    return { available: false, reply: UNAVAILABLE_REPLY, toolLog: [] };
  }

  const w2 = buildWhitelist(
    [...first.toolResults, ...second.toolResults],
    args.turns
  );
  const bad2 = unverifiedClaims(second.reply, w2);
  if (bad2.length > 0) {
    return { available: true, reply: UNVERIFIED_REPLY, toolLog };
  }
  return { available: true, reply: second.reply, toolLog };
}
