export default {
  include: ["app/**/*.{ts,tsx,js,jsx}", "src/**/*.{ts,tsx,js,jsx}"],
  exclude: ["node_modules/**", ".next/**", "dist/**"],
  secretPatterns: ["SECRET", "TOKEN", "PRIVATE_KEY", "SERVICE_ROLE", "DATABASE_URL"],
  allowedPublicEnv: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
  serverOnlyPaths: ["src/server/**", "server/**"],
  failOn: ["HIGH", "MEDIUM"]
};
