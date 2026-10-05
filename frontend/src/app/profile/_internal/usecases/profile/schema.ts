import { z } from "zod";

export const UserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  full_name: z.string(),
  profile_picture_url: z.string().nullable().optional(),
  role: z.enum(['manager', 'cashier']),
  is_active: z.boolean(),
});

export const UpdateProfileResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: UserProfileSchema.optional(),
});

export const UpdateProfileRequestSchema = z.object ({
  full_name: z.string().optional(),
  password: z.string().optional(),
  new_password: z.string().optional(),
  confirm_new_password: z.string().optional(),  
  profile_picture_url: z.string().nullable().optional(),
})

export const UpdateUserAdminRequestSchema = z.object({
  full_name: z.string().optional(),
  password: z.string().optional(),
  profile_picture_url: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})
