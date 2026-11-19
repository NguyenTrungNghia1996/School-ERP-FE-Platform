import type { MediaListParams, MediaTrashParams, MediaUploadInput, StoredFile } from "~/types/api/media";

/**
 * Composable gọi các API Platform Media của Tổ chức (/v1/platform/organizations/{org_id}/media* & storage/usage)
 */
export const useMediaApi = () => {
  const { fetchClient } = useRequest();
  const { extractApiData } = useApiError();

  const buildUploadFormData = (input: MediaUploadInput): FormData => {
    const formData = new FormData();
    formData.append("file", input.file);
    if (input.folder?.trim()) formData.append("folder", input.folder.trim());
    if (input.school_id?.trim()) formData.append("school_id", input.school_id.trim());
    return formData;
  };

  /** Upload ảnh/tài liệu lên S3/R2 của Tổ chức (POST /v1/platform/organizations/{org_id}/media/upload) */
  const uploadOrgMedia = (orgId: string, input: MediaUploadInput) =>
    fetchClient(`/v1/platform/organizations/${orgId}/media/upload`, {
      method: "POST",
      body: buildUploadFormData(input),
    });

  /**
   * Upload tệp trước và trả về access_url để dùng cho các API tạo/cập nhật sau đó.
   */
  const uploadAndGetUrl = async (orgId: string, input: MediaUploadInput) => {
    const res = await uploadOrgMedia(orgId, input);
    const uploaded = extractApiData(res.data) as StoredFile | null;
    return {
      ...res,
      file: uploaded,
      accessUrl: uploaded?.access_url || uploaded?.public_url || "",
    };
  };

  return {
    uploadOrgMedia,
    uploadAndGetUrl,

    listOrgMedia: (orgId: string, query?: MediaListParams) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media`, { method: "GET", query }),

    getOrgMediaUrl: (orgId: string, fileId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/${fileId}/url`, { method: "GET" }),

    getOrgStorageUsage: (orgId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/storage/usage`, { method: "GET" }),

    deleteOrgMediaByUrl: (orgId: string, access_url: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/by-url`, {
        method: "DELETE",
        body: { access_url },
      }),

    listOrgMediaTrash: (orgId: string, query?: MediaTrashParams) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/trash`, { method: "GET", query }),

    restoreOrgMedia: (orgId: string, fileId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/${fileId}/restore`, { method: "POST" }),

    permanentDeleteOrgMedia: (orgId: string, fileId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/${fileId}/permanent`, { method: "DELETE" }),
  };
};
