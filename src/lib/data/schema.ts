import { z } from "zod";

/** Validation for everything that can be written through the admin panel. */

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => text(max).min(1, "این فیلد الزامی است");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "فقط حروف انگلیسی کوچک، عدد و خط تیره")
  .max(60);

const price = z.coerce
  .number({ message: "قیمت باید عدد باشد" })
  .int("قیمت باید عدد صحیح باشد")
  .min(0, "قیمت نمی‌تواند منفی باشد")
  .max(1_000_000_000);

/** Image paths may only point at bundled images or uploaded media. */
export const imagePathSchema = z
  .string()
  .trim()
  .max(300)
  .regex(/^\/(images|media)\/[A-Za-z0-9/_.-]+$/, "مسیر تصویر نامعتبر است")
  .refine((p) => !p.includes(".."), "مسیر تصویر نامعتبر است");

export const variantSchema = z.object({
  labelFa: requiredText(40),
  labelEn: text(40).default(""),
  price,
});

export const categoryInputSchema = z.object({
  nameFa: requiredText(60),
  nameEn: text(60).default(""),
  slug: slugSchema,
  order: z.coerce.number().int().min(0).max(9999).default(0),
  visible: z.boolean().default(true),
});

export const itemInputSchema = z.object({
  categoryId: requiredText(64),
  nameFa: requiredText(80),
  nameEn: text(80).default(""),
  descriptionFa: text(400).default(""),
  descriptionEn: text(400).default(""),
  price,
  image: imagePathSchema.or(z.literal("")),
  available: z.boolean().default(true),
  popular: z.boolean().default(false),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  variants: z.array(variantSchema).max(8).default([]),
});

export const galleryInputSchema = z.object({
  altFa: text(120).default(""),
  altEn: text(120).default(""),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  size: z.enum(["normal", "wide", "tall"]).default("normal"),
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "ساعت را به شکل ۰۸:۰۰ وارد کنید");

export const hoursSchema = z.object({
  daysFa: requiredText(60),
  daysEn: text(60).default(""),
  open: time,
  close: time,
  closed: z.boolean().default(false),
});

const optionalCoord = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(min).max(max).nullable(),
  );

export const contactSchema = z.object({
  addressFa: text(300).default(""),
  addressEn: text(300).default(""),
  phone: text(40)
    .regex(/^[0-9۰-۹+\-() ]*$/, "شماره تلفن نامعتبر است")
    .default(""),
  instagram: text(60)
    .transform((v) => v.replace(/^@/, ""))
    .refine((v) => /^[A-Za-z0-9._]*$/.test(v), "شناسه اینستاگرام نامعتبر است")
    .default(""),
  email: z.union([z.literal(""), z.email("ایمیل نامعتبر است")]).default(""),
  mapUrl: z
    .union([z.literal(""), z.url("نشانی نقشه نامعتبر است").startsWith("https://", "نشانی باید با https شروع شود")])
    .default(""),
  latitude: optionalCoord(-90, 90),
  longitude: optionalCoord(-180, 180),
});

export const settingsSchema = z.object({
  contact: contactSchema,
  hours: z.array(hoursSchema).max(10),
  demoMode: z.boolean().default(false),
});

export type ItemInput = z.infer<typeof itemInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type GalleryInput = z.infer<typeof galleryInputSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
