import { z } from "zod";

export const BudgetTierSchema = z.enum(["budget", "moderate", "luxury"]);
export const VibeTypeSchema = z.enum(["classic", "hidden_gems"]);
export const PlaceCategorySchema = z.enum(["landmark", "food", "shopping", "nature"]);

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  displayName: z.string().min(1).max(50).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateTripSchema = z.object({
  cityId: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  vibe: VibeTypeSchema.default("classic"),
  budgetTier: BudgetTierSchema.default("moderate"),
});

export const UpdateTripSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  vibe: VibeTypeSchema.optional(),
  budgetTier: BudgetTierSchema.optional(),
});

export const AutocompleteQuerySchema = z.object({
  q: z.string().min(1).max(100),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const PlacesQuerySchema = z.object({
  cityId: z.string().uuid(),
  vibe: VibeTypeSchema.optional(),
  tier: BudgetTierSchema.optional(),
  category: PlaceCategorySchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50000).default(5000),
});

export const ReorderStopsSchema = z.object({
  stopIds: z.array(z.string().uuid()).min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateTripInput = z.infer<typeof CreateTripSchema>;
export type UpdateTripInput = z.infer<typeof UpdateTripSchema>;
