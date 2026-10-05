import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginSubmitValues = z.infer<typeof LoginSchema>;

export interface AuthState {
  isLoading: boolean;
  error: string | null;
}