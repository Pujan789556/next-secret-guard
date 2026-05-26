import type { PresetDefinition } from "../scanner/types";

export const prismaPreset: PresetDefinition = {
  name: "prisma",
  description: "Prisma database connection credentials",
  serverEnvNames: ["DATABASE_URL", "DIRECT_URL"]
};
