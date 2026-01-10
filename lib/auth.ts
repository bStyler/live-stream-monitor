import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Flexible localhost configuration for development
// In dev, accept any localhost port (3000, 3001, 3002, etc.)
// In production, use exact BETTER_AUTH_URL for security
const isDevelopment = process.env.NODE_ENV === "development";
const baseURL = process.env.BETTER_AUTH_URL!;
const trustedOrigins = isDevelopment
  ? [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
    ]
  : [];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable for MVP (no email service yet)
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Don't allow user to set role during signup
      },
      streamQuota: {
        type: "number",
        required: false,
        defaultValue: 1, // Trial: 1 slot, will be upgraded via billing
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL,
  trustedOrigins,
});
