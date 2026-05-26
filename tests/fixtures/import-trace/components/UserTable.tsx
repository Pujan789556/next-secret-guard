"use client";

import { createSupabaseClient } from "@/lib/supabase";

export function UserTable() {
  void createSupabaseClient();
  return <div>User table</div>;
}
