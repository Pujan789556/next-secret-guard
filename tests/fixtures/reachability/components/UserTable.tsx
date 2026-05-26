"use client";

import { getUsers } from "@/lib/users";

export function UserTable() {
  void getUsers();
  return <table />;
}
