import { z } from "zod";

export const customerPasswordSchema = z
  .string()
  .trim()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra.")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número.");

export const customerLoginSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido."),
  password: customerPasswordSchema,
});

export const customerRegistrationSchema = customerLoginSchema.extend({
  name: z.string().trim().min(2, "Decinos al menos tu nombre.").max(120, "Usá un nombre más corto."),
});

export const customerRegistrationFormSchema = customerRegistrationSchema
  .extend({
    confirmPassword: z.string().trim().min(1, "Repetí la contraseña para confirmar tu cuenta."),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden.",
      });
    }
  });

export function normalizeCustomerEmail(email: string) {
  return email.trim().toLowerCase();
}
