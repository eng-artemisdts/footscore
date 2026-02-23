import { z } from "zod";

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().trim().url(),
  VITE_SUPABASE_ANON_KEY: z.string().trim().min(1),
  VITE_APP_URL: z.string().trim().url().optional(),
});

const parsed = EnvSchema.safeParse(import.meta.env);

export const env = (() => {
  if (parsed.success) return parsed.data;
  const message = parsed.error.issues
    .map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
    .join("\n");
  throw new Error(`Variáveis de ambiente inválidas:\n${message}`);
})();

