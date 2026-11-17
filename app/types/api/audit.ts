/** Bản ghi nhật ký kiểm toán (audit.AuditLog) */
export interface AuditLog {
  id?: string;
  actor_type?: string;
  actor_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  organization_id?: string;
  school_id?: string;
  support_session_id?: string;
  reason?: string;
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

/** Query lọc nhật ký kiểm toán GET /v1/platform/audit-logs */
export interface AuditLogFilterParams {
  actor_type?: string;
  actor_id?: string;
  organization_id?: string;
  action?: string;
  resource_type?: string;
  page?: number;
  limit?: number;
}
