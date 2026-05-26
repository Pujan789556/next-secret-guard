import type { PresetDefinition } from "../scanner/types";

export const supabasePreset: PresetDefinition = {
  name: "supabase",
  description: "Supabase service role and admin-side secrets",
  serverEnvNames: ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_JWT_SECRET"]
};
