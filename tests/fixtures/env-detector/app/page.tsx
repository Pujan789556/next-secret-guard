"use client";

export default function Page() {
  const secret = process.env.NEXT_PUBLIC_SECRET;
  const privateThing = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  return <div>{secret}{privateThing}{databaseUrl}</div>;
}
