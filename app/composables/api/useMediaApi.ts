import type {
  MediaListParams,
  MediaTrashParams,
  MediaUploadInput,
  PlatformMediaUploadInput,
  StoredFile,
} from "~/types/api/media";

/**
 * Composable gọi các API Platform Media:
 * - Cấp Platform (/v1/platform/media*)
 * - Cấp Tổ chức (/v1/platform/organizations/{org_id}/media* & storage/usage)
 */
export const useMediaApi = () => {
  const { fetchClient } = useRequest();
  const { extractApiData, handleApiError } = useApiError();

  const buildUploadFormData = (input: MediaUploadInput | PlatformMediaUploadInput): FormData => {
    const formData = new FormData();
    formData.append("file", input.file);
    if (input.folder?.trim()) formData.append("folder", input.folder.trim());
    if ("school_id" in input && input.school_id?.trim()) {
      formData.append("school_id", input.school_id.trim());
    }
    return formData;
  };

  // --- Platform-level Media (không gắn org_id) ---
  const uploadPlatformMedia = (input: PlatformMediaUploadInput) =>
    fetchClient("/v1/platform/media/upload", {
      method: "POST",
      body: buildUploadFormData(input),
    });

  const listPlatformMedia = (query?: MediaListParams) =>
    fetchClient("/v1/platform/media", { method: "GET", query });

  const deletePlatformMediaByUrl = (access_url: string) =>
    fetchClient("/v1/platform/media/by-url", {
      method: "DELETE",
      body: { access_url },
    });

  // --- Organization-scoped Media (/v1/platform/organizations/{org_id}/media*) ---
  const uploadOrgMedia = (orgId: string, input: MediaUploadInput) =>
    fetchClient(`/v1/platform/organizations/${orgId}/media/upload`, {
      method: "POST",
      body: buildUploadFormData(input),
    });

  const deleteOrgMediaByUrl = (orgId: string, access_url: string) =>
    fetchClient(`/v1/platform/organizations/${orgId}/media/by-url`, {
      method: "DELETE",
      body: { access_url },
    });

  /**
   * Upload tệp trước và trả về access_url để dùng cho các API tạo/cập nhật sau đó.
   */
  const uploadAndGetUrl = async (
    orgIdOrInput: string | PlatformMediaUploadInput,
    maybeInput?: MediaUploadInput,
  ) => {
    const res =
      typeof orgIdOrInput === "string"
        ? await uploadOrgMedia(orgIdOrInput, maybeInput!)
        : await uploadPlatformMedia(orgIdOrInput);

    const uploaded = extractApiData(res.data) as StoredFile | null;
    return {
      ...res,
      file: uploaded,
      accessUrl: uploaded?.access_url || uploaded?.public_url || "",
    };
  };

  /**
   * Xóa tệp theo access_url đúng phạm vi (Platform hoặc Tổ chức).
   */
  const deleteMediaByUrl = (accessUrl: string, orgId?: string) => {
    if (orgId && !accessUrl.includes("/platform/")) {
      return deleteOrgMediaByUrl(orgId, accessUrl);
    }
    return deletePlatformMediaByUrl(accessUrl);
  };

  /**
   * Luồng chuẩn cập nhật bản ghi có ảnh:
   * 1. Upload ảnh mới trước (nếu có file) lấy access_url
   * 2. Gọi API tạo/cập nhật với URL cuối cùng
   * 3. Nếu tạo/cập nhật lỗi -> dọn file vừa upload để tránh file mồ côi
   * 4. Nếu thành công & URL thay đổi (hoặc bị xóa) -> xóa file cũ trên R2
   */
  const saveWithImageReplace = async <TRes extends { data: Ref<unknown>; error: Ref<unknown> }>(opts: {
    file?: File | null;
    currentUrl?: string;
    previousUrl?: string;
    orgId?: string;
    folder?: string;
    saveFn: (finalUrl: string) => Promise<TRes>;
    errorMessage: string;
  }): Promise<{ ok: boolean; url: string; res?: TRes }> => {
    let newlyUploadedUrl = "";
    let finalUrl = (opts.currentUrl || "").trim();

    if (opts.file) {
      const uploadRes = opts.orgId
        ? await uploadAndGetUrl(opts.orgId, { file: opts.file, folder: opts.folder })
        : await uploadAndGetUrl({ file: opts.file, folder: opts.folder });

      if (handleApiError(uploadRes.data, uploadRes.error, "Tải ảnh lên thất bại!")) {
        return { ok: false, url: finalUrl };
      }
      newlyUploadedUrl = uploadRes.accessUrl;
      finalUrl = uploadRes.accessUrl;
    }

    const res = await opts.saveFn(finalUrl);
    if (handleApiError(res.data, res.error, opts.errorMessage)) {
      if (newlyUploadedUrl) {
        await deleteMediaByUrl(newlyUploadedUrl, opts.orgId).catch(() => {});
      }
      return { ok: false, url: finalUrl, res };
    }

    const prev = (opts.previousUrl || "").trim();
    if (prev && prev !== finalUrl) {
      await deleteMediaByUrl(prev, opts.orgId).catch(() => {});
    }

    return { ok: true, url: finalUrl, res };
  };

  return {
    uploadPlatformMedia,
    listPlatformMedia,
    deletePlatformMediaByUrl,
    uploadOrgMedia,
    uploadAndGetUrl,
    deleteMediaByUrl,
    saveWithImageReplace,

    listOrgMedia: (orgId: string, query?: MediaListParams) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media`, { method: "GET", query }),

    getOrgMediaUrl: (orgId: string, fileId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/${fileId}/url`, { method: "GET" }),

    getOrgStorageUsage: (orgId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/storage/usage`, { method: "GET" }),

    deleteOrgMediaByUrl,

    listOrgMediaTrash: (orgId: string, query?: MediaTrashParams) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/trash`, { method: "GET", query }),

    restoreOrgMedia: (orgId: string, fileId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/${fileId}/restore`, { method: "POST" }),

    permanentDeleteOrgMedia: (orgId: string, fileId: string) =>
      fetchClient(`/v1/platform/organizations/${orgId}/media/${fileId}/permanent`, { method: "DELETE" }),
  };
};
