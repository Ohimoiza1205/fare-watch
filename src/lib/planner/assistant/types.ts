import type { AlternativeOption } from "../alternatives";

// Shared shape for what the assistant hands back to the client. The options are
// always real lookup results, so nothing here can carry an invented price.
export type AssistantSuggestion = {
  itemRef: { dayIndex: number; position: number };
  currentName: string;
  currentPrice: number | null;
  currency: string;
  options: AlternativeOption[];
};

export type { AlternativeOption };
