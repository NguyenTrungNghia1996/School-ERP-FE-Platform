/** Tệp media đã lưu trữ trên R2/S3 (media.StoredFile) */
export interface StoredFile {
  id?: string;
  organization_id?: string;
  school_id?: string;
  folder?: string;
  original_name?: string;
  mime_type?: string;
  size_bytes?: number;
  bucket?: string;
  object_key?: string;
  public_url?: string;
  access_url?: string;
  storage_provider?: string;
  uploaded_by?: string;
  created_at?: string;
  deleted_at?: string;
  purged_at?: string;
}

/** Kết quả lấy đường dẫn truy cập tệp GET /v1/platform/organizations/{org_id}/media/{file_id}/url (media.MediaFileURLOutput) */
export interface MediaFileURLOutput {
  file_id?: string;
  object_key?: string;
  url?: string;
  expires_in_seconds?: number;
}

/** Thống kê dung lượng lưu trữ GET /v1/platform/organizations/{org_id}/storage/usage (media.StorageUsageOutput) */
export interface StorageUsageOutput {
  organization_id?: string;
  folder_prefix?: string;
  file_count?: number;
  used_bytes?: number;
  quota_bytes?: number;
  remaining_bytes?: number;
  usage_percent?: number;
}

/** Payload xóa tệp theo access_url DELETE /v1/platform/organizations/{org_id}/media/by-url (media.DeleteByURLInput) */
export interface DeleteByURLInput {
  access_url?: string;
}

/** Query params danh sách tệp GET /v1/platform/organizations/{org_id}/media */
export interface MediaListParams {
  /** Lọc theo thư mục con */
  folder?: string;
  page?: number;
  limit?: number;
}

/** Query params danh sách thùng rác GET /v1/platform/organizations/{org_id}/media/trash */
export interface MediaTrashParams {
  page?: number;
  limit?: number;
}

/** Form data tải lên tệp POST /v1/platform/organizations/{org_id}/media/upload */
export interface MediaUploadInput {
  /** Tệp ảnh (JPEG, PNG, WEBP, GIF) hoặc tài liệu (PDF, DOC, DOCX, XLS, XLSX; tối đa 25 MB) */
  file: File;
  /** Thư mục con (VD: logos, avatars, students, documents) */
  folder?: string;
  /** School ID (nếu tách theo trường) */
  school_id?: string;
}
