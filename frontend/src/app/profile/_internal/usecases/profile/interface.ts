import { z } from "zod";
import {
  UserProfileSchema,
  UpdateProfileResponseSchema,
  UpdateProfileRequestSchema,
  UpdateUserAdminRequestSchema, 
} from "./schema";

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;  
export type UpdateUserAdminRequest = z.infer<typeof UpdateUserAdminRequestSchema>;