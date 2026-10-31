import { z } from 'zod';

/** Strict output contract for the vision step (PRD 6.3). */
export const AssistantStep = z.object({
  screen_name: z.string(),
  confidence: z.number().min(0).max(1),
  next_instruction_ur: z.string().max(400),
  next_instruction_roman: z.string().max(400),
  target_label: z.string().nullable(),
  warnings: z.array(z.string()).default([]),
  needs_clarification: z.boolean(),
  is_money_step: z.boolean().default(false),
  task_complete: z.boolean().default(false),
  recap_roman: z.array(z.string()).optional(),
  why_roman: z.string().max(400).optional(),
});
export type AssistantStep = z.infer<typeof AssistantStep>;

export const AssistantRequest = z.object({
  message: z.string().max(1000).default(''),
  image: z.string().max(4_000_000).nullable().optional(), // data URL, already resized client-side
  ocrText: z.string().max(8000).optional(),
  state: z.object({
    task: z.string().nullable(),
    bank: z.string().nullable(),
    stepIndex: z.number().int().min(0),
  }),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(1500) })).max(20).default([]),
});
export type AssistantRequest = z.infer<typeof AssistantRequest>;
