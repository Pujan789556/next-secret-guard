import "server-only";
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();
