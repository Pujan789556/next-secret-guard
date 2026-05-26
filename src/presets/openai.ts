import type { PresetDefinition } from "../scanner/types";

export const openaiPreset: PresetDefinition = {
  name: "openai",
  description: "OpenAI API secrets",
  serverEnvNames: ["OPENAI_API_KEY"]
};
