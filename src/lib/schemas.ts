import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().trim().min(2),
  websiteUrl: z.string().url(),
});

export const addCompetitorsSchema = z.object({
  competitors: z.array(z.string().trim().min(2)).min(1).max(3),
});

export const chatSchema = z.object({
  message: z.string().trim().min(2),
});
