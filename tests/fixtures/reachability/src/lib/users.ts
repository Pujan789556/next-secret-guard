import { db } from "@/server/db";

export async function getUsers() {
  return db.user.findMany();
}
