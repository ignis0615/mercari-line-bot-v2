import { z } from "zod";

export const ProductAnalysisSchema = z.object({
  category: z.string().nullable(),
  brand: z.string().nullable(),
  product_name: z.string().nullable(),
  model_number: z.string().nullable(),
  color: z.string().nullable(),
  condition: z.string().nullable(),
  damage: z.array(z.string()).default([]),
  accessories: z.array(z.string()).default([]),
  missing_accessories: z.array(z.string()).default([]),
  identification_confidence: z.number().min(0).max(1),
});
export type ProductAnalysis = z.infer<typeof ProductAnalysisSchema>;

export const ListingContentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  recommended_price: z.number().int().nonnegative(),
  quick_sale_price: z.number().int().nonnegative(),
  high_price: z.number().int().nonnegative(),
  price_confidence: z.enum(["low", "medium", "high"]),
  price_note: z.string(),
});
export type ListingContent = z.infer<typeof ListingContentSchema>;
