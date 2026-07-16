// The one place the language model is configured. Set the key and model once
// through the environment and every assistant call uses them. Two shapes are
// supported so a key from either service works without touching callers.
//
//   ASSISTANT_API_KEY    the key, required, or the assistant stays off
//   ASSISTANT_PROVIDER   anthropic (default) or openai
//   ASSISTANT_MODEL      model id, with a sensible default per provider
//   ASSISTANT_BASE_URL   override the endpoint, optional

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AssistantConfig = {
  provider: "anthropic" | "openai";
  model: string;
  apiKey: string;
  baseUrl: string;
};

export function assistantConfig(): AssistantConfig | null {
  const apiKey = process.env.ASSISTANT_API_KEY;
  if (!apiKey) return null;

  const provider = process.env.ASSISTANT_PROVIDER === "openai" ? "openai" : "anthropic";
  const model =
    process.env.ASSISTANT_MODEL ??
    (provider === "openai" ? "gpt-4o-mini" : "claude-3-5-haiku-latest");
  const baseUrl =
    process.env.ASSISTANT_BASE_URL ??
    (provider === "openai"
      ? "https://api.openai.com/v1"
      : "https://api.anthropic.com/v1");

  return { provider, model, apiKey, baseUrl };
}

type AnthropicResponse = { content?: { type: string; text?: string }[] };
type OpenAiResponse = { choices?: { message?: { content?: string } }[] };

async function anthropic(
  cfg: AssistantConfig,
  system: string,
  turns: ChatTurn[]
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 1024,
      system,
      messages: turns,
    }),
  });
  if (!res.ok) throw new Error(`assistant call failed ${res.status}`);
  const json = (await res.json()) as AnthropicResponse;
  return (json.content ?? []).map((c) => c.text ?? "").join("").trim();
}

async function openai(
  cfg: AssistantConfig,
  system: string,
  turns: ChatTurn[]
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "system", content: system }, ...turns],
    }),
  });
  if (!res.ok) throw new Error(`assistant call failed ${res.status}`);
  const json = (await res.json()) as OpenAiResponse;
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

export async function complete(
  cfg: AssistantConfig,
  system: string,
  turns: ChatTurn[]
): Promise<string> {
  return cfg.provider === "openai"
    ? openai(cfg, system, turns)
    : anthropic(cfg, system, turns);
}
