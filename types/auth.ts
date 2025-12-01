export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export type LoginType = "admin" | "doctor" | "nurse" | "team" | "field-user";

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: LoginType;
  };
}
