import { message } from "antdv-next";

export const useApiError = () => {
  /**
   * Trích xuất dữ liệu an toàn cho cả 2 dạng:
   * - Trả trực tiếp: { ... }
   * - Bọc trong wrapper: { data: ..., success: true }
   */
  const extractApiData = (resData) => {
    const raw = unref(resData);
    if (raw && typeof raw === "object" && "data" in raw && "success" in raw) {
      return raw.data;
    }
    return raw;
  };

  /**
   * Kiểm tra và hiển thị lỗi API. Trả về true nếu có lỗi.
   */
  const handleApiError = (resData, error, defaultMessage = "Đã xảy ra lỗi!") => {
    const rawErr = unref(error);
    if (rawErr) {
      const errMsg = rawErr?.data?.message || rawErr?.statusMessage || rawErr?.message || defaultMessage;
      message.error(errMsg);
      return true;
    }

    const rawData = unref(resData);
    if (rawData && typeof rawData === "object" && rawData.success === false) {
      message.error(rawData.message || defaultMessage);
      return true;
    }

    return false;
  };

  return {
    extractApiData,
    handleApiError,
  };
};
