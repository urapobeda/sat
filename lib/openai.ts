import "server-only";

import OpenAI from "openai";

let openAIClient: OpenAI | null = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  openAIClient ??= new OpenAI({ apiKey });

  return openAIClient;
}

export function getOpenAIModel() {
  const model = process.env.OPENAI_MODEL;

  if (!model) {
    throw new Error("OPENAI_MODEL is not configured on the server.");
  }

  return model;
}
