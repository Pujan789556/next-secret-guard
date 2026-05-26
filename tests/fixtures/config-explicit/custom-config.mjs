export default {
  include: ["pages/**/*.{ts,tsx,js,jsx}"],
  exclude: ["node_modules/**"],
  secretPatterns: ["SECRET", "TOKEN", "PRIVATE_KEY"],
  allowedPublicEnv: ["NEXT_PUBLIC_CUSTOM_URL"],
  serverOnlyPaths: ["custom/server/**"],
  failOn: ["HIGH"]
};
