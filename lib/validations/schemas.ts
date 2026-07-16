import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(1),
  unitCost: z.number().min(0),
  sellingPrice: z.number().min(0),
  currentStockQty: z.number().int().min(0).default(0),
  reorderPoint: z.number().int().min(0).default(0),
});

export const updateVariantSchema = createVariantSchema.partial().omit({ productId: true });

export const quickLogSchema = z.object({
  items: z.array(z.object({
    variantId: z.string().min(1),
    qty: z.number().int().min(1),
  })).min(1),
  channel: z.enum(["WEB", "FACEBOOK_POST", "FACEBOOK_MARKETPLACE", "PHYSICAL"]),
  paymentMethod: z.enum(["CASH", "GCASH", "MAYA", "BANK_TRANSFER", "CARD_ONLINE", "CARD_OTC"]),
  phone: z.string().optional(),
  saleDate: z.string().datetime().optional(),
});

export const restockSchema = z.object({
  variantId: z.string().min(1),
  supplierId: z.string().min(1),
  qty: z.number().int().min(1),
  unitCost: z.number().min(0),
});

export const createProcurementSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(z.object({
    variantId: z.string().min(1),
    qty: z.number().int().min(1),
    unitCost: z.number().min(0),
  })).min(1),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const updateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
});

export const updateOrderSchema = z.object({
  notes: z.string().optional(),
  discount: z.number().min(0).optional(),
});

export const createSupplierProductSchema = z.object({
  supplierId: z.string().min(1),
  variantId: z.string().min(1),
  unitCost: z.number().min(0),
  leadTimeDays: z.number().int().min(0).optional(),
  isPreferred: z.boolean().optional(),
});

export const updateLedgerSchema = z.object({
  note: z.string().nullable().optional(),
  channel: z.enum(["WEB", "FACEBOOK_POST", "FACEBOOK_MARKETPLACE", "PHYSICAL"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6),
});
