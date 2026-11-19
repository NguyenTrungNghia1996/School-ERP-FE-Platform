/** Tổ chức / Tenant (tenant_mgmt.Organization) */
export interface Organization {
  id?: string;
  code?: string;
  name?: string;
  logo_url?: string;
  subdomain?: string;
  tax_code?: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
  status_reason?: string;
  dns_status?: string;
  dns_last_error?: string;
  dns_synced_at?: string;
  cloudflare_dns_record_id?: string;
  approved_at?: string;
  approved_by?: string;
  created_at?: string;
  updated_at?: string;
  subdomain_histories?: OrganizationSubdomainHistory[];
}

/** Tóm tắt Tổ chức trong danh sách (tenant_mgmt.OrganizationSummary) */
export interface OrganizationSummary extends Organization {
  primary_package_name?: string;
  primary_expires_at?: string;
  school_count?: number;
}

/** Lịch sử đổi Subdomain (tenant_mgmt.OrganizationSubdomainHistory) */
export interface OrganizationSubdomainHistory {
  id?: string;
  organization_id?: string;
  old_subdomain?: string;
  new_subdomain?: string;
  old_cloudflare_record_id?: string;
  old_record_status?: string;
  reason?: string;
  redirect_until?: string;
  approved_by?: string;
  cleaned_up_at?: string;
  created_at?: string;
}

/** Từ khóa Subdomain giữ chỗ (tenant_mgmt.ReservedSubdomain) */
export interface ReservedSubdomain {
  keyword?: string;
  reason?: string;
  created_by?: string;
  created_at?: string;
}

/** Query lọc danh sách Tổ chức GET /v1/platform/organizations */
export interface OrganizationFilterParams {
  search?: string;
  status?: string;
  dns_status?: string;
  page?: number;
  limit?: number;
}

/** Input tạo Tổ chức kèm trường đầu tiên và School Admin (tenant_mgmt.CreateOrganizationInput) */
export interface CreateOrganizationInput {
  code?: string;
  name?: string;
  logo_url?: string;
  subdomain?: string;
  tax_code?: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  school?: {
    code?: string;
    name?: string;
    logo_url?: string;
    level?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  admin?: {
    full_name?: string;
    email?: string;
    phone?: string;
    password?: string;
  };
}

/** Input cập nhật thông tin Tổ chức PATCH /v1/platform/organizations/{id} (tenant_mgmt.UpdateOrganizationInput) */
export interface UpdateOrganizationInput {
  name?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  tax_code?: string;
  address?: string;
}
