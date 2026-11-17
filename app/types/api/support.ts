/** Phiên hỗ trợ kỹ thuật (support.SupportAccessSession) */
export interface SupportAccessSession {
  id?: string;
  actor_platform_user_id?: string;
  approved_by?: string;
  organization_id?: string;
  school_id?: string;
  /** READ_ONLY | READ_WRITE */
  session_type?: string;
  /** PENDING | APPROVED | ACTIVE | EXPIRED | REVOKED | REJECTED */
  status?: string;
  granted_permissions?: string[];
  reason?: string;
  revoke_reason?: string;
  revoked_by?: string;
  revoked_at?: string;
  started_at?: string;
  expires_at?: string;
  created_at?: string;
}

/** Input tạo phiên hỗ trợ POST /v1/platform/support-sessions (support.CreateSessionInput) */
export interface CreateSessionInput {
  organization_id?: string;
  school_id?: string;
  session_type?: string;
  duration_minutes?: number;
  granted_permissions?: string[];
  reason?: string;
}

/** Query lọc danh sách phiên hỗ trợ GET /v1/platform/support-sessions */
export interface SupportSessionFilterParams {
  status?: string;
  organization_id?: string;
  page?: number;
  limit?: number;
}
