---
description: Quy tắc chuẩn hóa việc đọc API Spec từ Apidog MCP (apidog-erp) và sinh code tự động cho dự án School ERP
trigger: always_on
---

# Quy tắc tích hợp và sinh code từ Apidog MCP (`apidog-erp`)

Khi nhận yêu cầu tạo mới, chỉnh sửa hoặc kiểm tra các tính năng liên quan đến gọi API, Data Model, hoặc tích hợp Backend cho dự án **School ERP**, bạn BẮT BUỘC phải tuân thủ quy trình và các tiêu chuẩn dưới đây:

## 0. Phạm vi MCP Server (Bắt buộc)

- **Server được phép dùng:** **CHỈ** sử dụng các công cụ thuộc MCP server **`apidog-erp`** (`read_project_oas_w5ttxc`, `read_project_oas_ref_resources_w5ttxc`, `refresh_project_oas_w5ttxc`).
- **Cấm truy cập chéo:** **TUYỆT ĐỐI KHÔNG** gọi sang bất kỳ Apidog MCP server nào khác (ví dụ `apidog-task`, `apidog-wms`) khi đang làm việc trong workspace này.

## 1. Quy trình truy xuất dữ liệu (Source of Truth)

- **Không tự suy đoán (Zero Hallucination):** Tuyệt đối không tự bịa ra đường dẫn endpoint, tên trường (field), kiểu dữ liệu hoặc cấu trúc phản hồi (response).
- **Luôn tra cứu qua MCP trước:** Sử dụng công cụ của **`apidog-erp`** để đọc OpenAPI Specification của endpoint được yêu cầu (kèm các `$ref` schema liên quan) trước khi viết bất kỳ dòng code nào.
- **Cập nhật Cache khi có yêu cầu:** Nếu người dùng báo "API vừa cập nhật trên Apidog" hoặc thấy thiếu trường mới, hãy gọi `refresh_project_oas_w5ttxc` để lấy spec mới nhất trước khi sửa code.

## 2. Quy chuẩn sinh Type / Interface (Data Models)

- **Đường dẫn lưu trữ:** Toàn bộ TypeScript Interfaces / Types sinh ra từ schema của Apidog phải được đặt tại `app/types/api/<module_name>.ts`.
- **Ánh xạ chính xác:**
  - Giữ nguyên tên thuộc tính gốc của JSON payload (`snake_case` hoặc `camelCase` đúng như Apidog định nghĩa).
  - Các trường không nằm trong danh sách `required` của schema phải được đánh dấu optional (`?`) hoặc cho phép `null` tùy theo định nghĩa (`nullable`).
  - Luôn tách riêng interface cho **Request Payload / Query Params** (ví dụ: `CreateStudentRequest`, `StudentFilterParams`) và **Response Data** (ví dụ: `StudentResponse`).
  - Bọc kết quả trả về trong kiểu dữ liệu chuẩn của dự án (`ApiResponse<T>` hoặc `PaginatedResponse<T>`, khai báo dùng chung tại `app/types/api/common.ts`).
- **Chú thích (JSDoc):** Trích xuất phần `description` của từng trường trên Apidog để tạo comment JSDoc ngắn gọn phía trên các trường quan trọng.

## 3. Quy chuẩn viết hàm gọi API (API Client / Services)

- **Kiến trúc có sẵn của dự án (bắt buộc tái sử dụng):**
  - `app/composables/useRequest.js`: lớp request gốc, tự gắn `baseURL` (từ `runtimeConfig.public.apiBase` / biến môi trường `NUXT_PUBLIC_API_BASE`) và header `Authorization: Bearer <token>`. Cung cấp `useCrudApi(endpointPath)` với các hàm `get` (SSR qua `useFetch`), `getClient`, `post`, `put`, `patch`, `delete` (qua `$fetch`, trả về `{ data, error }`).
  - `app/composables/useApi.js`: nơi đăng ký tập trung mọi endpoint, ví dụ `health: useCrudApi("/api/health")`.
  - `app/composables/useApiError.js`: `handleApiError(resData, error, defaultMessage)` và `extractApiData(resData)` để xử lý lỗi và bóc dữ liệu cho cả dạng trả trực tiếp lẫn dạng bọc `{ data, success }`.
- **Vị trí đặt file:**
  - Endpoint CRUD đơn giản: đăng ký thẳng vào `useApi.js`.
  - Module có logic riêng (endpoint con, query đặc thù, mapping dữ liệu): tạo `app/composables/api/use<ModuleName>Api.ts`, bên trong vẫn dùng `useRequest` / `useCrudApi`.
- **Công cụ HTTP:** Chỉ dùng `useFetch` / `$fetch` thông qua wrapper trên. KHÔNG tự ý cài thêm hoặc import trực tiếp `axios` trừ khi có yêu cầu cụ thể.
- **Xử lý lỗi (Error Handling):** Dựa vào danh sách mã phản hồi lỗi (400, 401, 403, 404, 422, 500) được định nghĩa trong Apidog của endpoint đó để viết khối xử lý lỗi, hiển thị thông báo bằng `message` / `notification` của `antdv-next` (thông qua `handleApiError`).

## 4. Quy trình phản hồi sau khi sinh code

Sau khi tạo hoặc cập nhật code từ **`apidog-erp`**, hãy tóm tắt ngắn gọn:

1. Tên Endpoint và Method vừa đồng bộ (ví dụ: `POST /api/v1/students`).
2. Danh sách các file đã tạo mới hoặc chỉnh sửa.
3. Các điểm lưu ý đặc biệt phát hiện từ spec (ví dụ: trường bắt buộc, giới hạn phân trang, định dạng ngày tháng).
