import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APIFY_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  APIFY_TOKEN: z.string().optional(),
  APIFY_ACTOR_ID: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_VISION_MODEL: z.string().default("gpt-4o-mini"),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  APIFY_ENABLED: process.env.APIFY_ENABLED,
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  APIFY_ACTOR_ID: process.env.APIFY_ACTOR_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL,
});

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${formatted}`);
}

export const env = parsed.data;
