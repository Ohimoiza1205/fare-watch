// The one place the Anthropic Messages API is called. Reads ANTHROPIC_API_KEY;
// when the key is absent every run reports unavailable without throwing, so the
// routes can answer with one plain sentence. The key is never logged or echoed.

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AssistantTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
  // One static line per completed call, past tense, shown in the panel.
  summarize: (input: Record<string, unknown>, result: unknown) => string;
};

export type AssistantRun =
  | { available: false }
  | { available: true; reply: string; toolLog: string[]; toolResults: unknown[] };

// Cost caps, all in one place. Tool payloads dominate token cost, so the loop
// is bounded hard: five tool rounds per message before a final answer is
// forced, replies capped at 800 tokens, and only the last twelve chat turns are
// sent. Client turns are plain text; tool blocks exist only inside one request
// cycle, already bounded by the iteration cap, so the window trims turns whole.
export const MAX_TOOL_ITERATIONS = 5;
export const MAX_REPLY_TOKENS = 800;
export const HISTORY_WINDOW = 12;

// Cheapest current model that handles tool use well. Override per environment.
const DEFAULT_MODEL = "claude-haiku-4-5";
const API_URL = "https://api.anthropic.com/v1/messages";

type ToolUseBlock = { type: "tool_use"; id: string; name: string; input?: Record<string, unknown> };
type TextBlock = { type: "text"; text: string };
type ContentBlock = ToolUseBlock | TextBlock | { type: string };
type ApiMessage = { role: "user" | "assistant"; content: string | unknown[] };
type ApiResponse = { content?: ContentBlock[]; stop_reason?: string };

function isToolUse(b: ContentBlock): b is ToolUseBlock {
  return b.type === "tool_use";
}
function isText(b: ContentBlock): b is TextBlock {
  return b.type === "text";
}

async function request(
  apiKey: string,
  model: string,
  system: string,
  messages: ApiMessage[],
  tools: AssistantTool[],
  forceText: boolean
): Promise<ApiResponse> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_REPLY_TOKENS,
      system,
      messages,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
      ...(forceText ? { tool_choice: { type: "none" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`assistant request failed ${res.status}`);
  }
  return (await res.json()) as ApiResponse;
}

// One tool-use loop for one user message: send, execute requested tools, feed
// results back, repeat until the model answers in text or a cap trips.
export async function runToolLoop(args: {
  system: string;
  turns: ChatTurn[];
  tools: AssistantTool[];
}): Promise<AssistantRun> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { available: false };
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const messages: ApiMessage[] = args.turns
    .slice(-HISTORY_WINDOW)
    .map((t) => ({ role: t.role, content: t.content }));

  const toolLog: string[] = [];
  const toolResults: unknown[] = [];
  const seenCalls = new Set<string>();
  let iterations = 0;
  let forceFinal = false;

  for (;;) {
    const final = forceFinal || iterations >= MAX_TOOL_ITERATIONS;
    const msg = await request(apiKey, model, args.system, messages, args.tools, final);
    const content = msg.content ?? [];
    const toolUses = content.filter(isToolUse);

    if (final || msg.stop_reason !== "tool_use" || toolUses.length === 0) {
      const reply = content.filter(isText).map((b) => b.text).join("").trim();
      return { available: true, reply, toolLog, toolResults };
    }

    iterations++;
    messages.push({ role: "assistant", content });

    const resultBlocks: unknown[] = [];
    for (const use of toolUses) {
      const input = use.input ?? {};
      const key = `${use.name}:${JSON.stringify(input)}`;
      // A repeated identical call cannot produce new information; force the
      // answer instead of burning the remaining budget.
      if (seenCalls.has(key)) forceFinal = true;
      seenCalls.add(key);

      const tool = args.tools.find((t) => t.name === use.name);
      let result: unknown;
      let isError = false;
      if (!tool) {
        result = { error: "unknown tool" };
        isError = true;
      } else {
        try {
          result = await tool.execute(input);
        } catch {
          result = { error: "lookup failed" };
          isError = true;
        }
      }
      if (tool && !isError) {
        toolLog.push(tool.summarize(input, result));
        toolResults.push(result);
      }
      resultBlocks.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: JSON.stringify(result),
        ...(isError ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: resultBlocks });
  }
}
