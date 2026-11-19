/** Node menu trả về từ GET /v1/platform/me và GET /v1/platform/menus/tree (menu.AntDMenuNode) */
export interface AntDMenuNode {
  id?: string;
  key?: string;
  label?: string;
  path?: string;
  icon?: string;
  type?: string;
  hidden?: boolean;
  sort_order?: number;
  badge_key?: string;
  required_permission_code?: string;
  children?: AntDMenuNode[];
}

/** Vai trò nền tảng (iam.PlatformRole) */
export interface PlatformRole {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Thông tin nhân sự nền tảng (iam.PlatformUser) */
export interface PlatformUser {
  id?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  status?: string;
  mfa_enabled?: boolean;
  must_change_password?: boolean;
  last_login_at?: string;
  roles?: PlatformRole[];
  created_at?: string;
  updated_at?: string;
}

/** Response data của GET /v1/platform/me (auth.MeProfile) */
export interface MeProfile {
  user?: PlatformUser & Record<string, unknown>;
  roles?: string[];
  permissions?: string[];
  menus?: AntDMenuNode[];
}

/** Request body của POST /v1/platform/auth/login (auth.LoginInput) */
export interface LoginInput {
  email: string;
  password: string;
  otp_code?: string;
}

/** Response data của POST /v1/platform/auth/login & /refresh (auth.LoginOutput) */
export interface LoginOutput {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/** Request body của PATCH /v1/platform/me (auth.UpdateMeInput) */
export interface UpdateMeInput {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

/** Response data của POST /v1/platform/me/mfa/setup (auth.MFASetupOutput) */
export interface MFASetupOutput {
  account?: string;
  issuer?: string;
  otpauth_url?: string;
  secret?: string;
}

/**
 * Request body của POST /v1/platform/me/change-password & PATCH /v1/platform/me/password
 * Theo OpenAPI spec apidog-erp (Body2: additionalProperties string)
 */
export type ChangePasswordInput = Record<string, string>;

/**
 * Request body của POST /v1/platform/me/mfa/enable & /disable
 * Theo OpenAPI spec apidog-erp (additionalProperties string)
 */
export type MFACodeInput = Record<string, string>;
