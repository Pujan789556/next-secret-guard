import type { PresetDefinition } from "../scanner/types";

export const authPreset: PresetDefinition = {
  name: "auth",
  description: "Common auth provider secrets",
  serverEnvNames: ["AUTH_SECRET", "NEXTAUTH_SECRET", "CLERK_SECRET_KEY", "CLERK_JWT_KEY"]
};
