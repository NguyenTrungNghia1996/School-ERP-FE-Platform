import type { CatalogFeature } from "./catalog";

/** Gói dịch vụ (billing.ServicePackage) */
export interface ServicePackage {
  id?: string;
  code?: string;
  name?: string;
  package_type?: string;
  description?: string;
  is_active?: boolean;
  is_public?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  versions?: ServicePackageVersion[];
}

/** Phiên bản gói dịch vụ (billing.ServicePackageVersion) */
export interface ServicePackageVersion {
  id?: string;
  package_id?: string;
  package?: ServicePackage;
  version_number?: number;
  version_label?: string;
  status?: string;
  base_price?: number;
  billing_cycle?: string;
  currency?: string;
  features?: CatalogFeature[];
  quotas?: Record<string, unknown>;
  release_notes?: string;
  published_at?: string;
  published_by?: string;
  created_at?: string;
  updated_at?: string;
}

/** Gói dịch vụ kèm thống kê (billing.ServicePackageWithSummary) */
export interface ServicePackageWithSummary extends ServicePackage {
  active_org_count?: number;
  latest_published_version?: ServicePackageVersion;
}

/** Input tạo gói dịch vụ (billing.CreatePackageInput) */
export interface CreatePackageInput {
  code?: string;
  name?: string;
  package_type?: string;
  description?: string;
  is_active?: boolean;
  is_public?: boolean;
}

/** Input tạo phiên bản mới DRAFT (billing.CreateVersionInput) */
export interface CreateVersionInput {
  version_label?: string;
  base_price?: number;
  billing_cycle?: string;
  currency?: string;
  feature_ids?: string[];
  quotas?: Record<string, unknown>;
  release_notes?: string;
  clone_from_version_id?: string;
}

/** Input cập nhật phiên bản DRAFT (billing.UpdateVersionInput) */
export type UpdateVersionInput = Omit<CreateVersionInput, "clone_from_version_id">;

/** Gói đã cấp cho Tổ chức (billing.OrganizationSubscription) */
export interface OrganizationSubscription {
  id?: string;
  organization_id?: string;
  package_version_id?: string;
  package_version?: ServicePackageVersion;
  subscription_type?: string;
  status?: string;
  auto_renew?: boolean;
  custom_quotas?: Record<string, unknown>;
  notes?: string;
  started_at?: string;
  expires_at?: string;
  assigned_by?: string;
  revoked_at?: string;
  revoked_by?: string;
  revoke_reason?: string;
  created_at?: string;
  updated_at?: string;
}

/** Input cấp gói dịch vụ cho Tổ chức (billing.CreateSubscriptionInput) */
export interface CreateSubscriptionInput {
  package_version_id?: string;
  started_at?: string;
  expires_at?: string;
  auto_renew?: boolean;
  custom_quotas?: Record<string, unknown>;
  notes?: string;
}

/** Input gia hạn gói (billing.RenewSubscriptionInput) */
export interface RenewSubscriptionInput {
  package_version_id?: string;
  new_expires_at?: string;
  custom_quotas?: Record<string, unknown>;
  notes?: string;
}

/** Input đổi gói chính PRIMARY (billing.SwitchPrimaryInput) */
export interface SwitchPrimaryInput {
  package_version_id?: string;
  new_expires_at?: string;
  custom_quotas?: Record<string, unknown>;
  notes?: string;
  reason?: string;
}

/** Tóm tắt gói hiệu lực (billing.ActivePackageSummary) */
export interface ActivePackageSummary {
  subscription_id?: string;
  package_code?: string;
  package_name?: string;
  version_number?: number;
  expires_at?: string;
}

/** Entitlement hiệu lực của Tổ chức (billing.OrganizationEntitlement) */
export interface OrganizationEntitlement {
  organization_id?: string;
  primary_package?: ActivePackageSummary;
  active_addons?: ActivePackageSummary[];
  enabled_features?: string[];
  effective_quotas?: Record<string, number>;
  nearest_expiry_at?: string;
  calculated_at?: string;
}
