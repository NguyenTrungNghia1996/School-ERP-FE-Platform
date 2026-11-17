# Hướng Dẫn Phát Triển & Quy Chuẩn Dự Án (AGENTS.md)

Quy chuẩn phát triển cho **School ERP – FE Platform** (Nuxt 4 + antdv-next + Tailwind).
Mọi endpoint, field và cấu trúc response trong tài liệu này được lấy từ OpenAPI spec của MCP **`apidog-erp`** ("REST API for School ERP"). Khi spec thay đổi, cập nhật lại tài liệu này theo spec, không tự suy đoán.

> [!IMPORTANT]
> Quy tắc đọc spec và sinh code từ Apidog nằm ở [.agents/rules/apidog.md](.agents/rules/apidog.md). Chỉ dùng MCP `apidog-erp`, không dùng `apidog-task` / `apidog-wms`.

### Trạng thái triển khai

| Thành phần | Tệp | Trạng thái |
| --- | --- | --- |
| Request layer + `useCrudApi` | `app/composables/useRequest.js` | ✅ Đã có |
| Đăng ký API tập trung | `app/composables/useApi.js` | ✅ Đã có (`health`) |
| Xử lý lỗi | `app/composables/useApiError.js` | ✅ Đã có |
| `usePermission()` | `app/composables/usePermission.js` | ⏳ Chưa triển khai |
| Directive `v-permission` | `app/plugins/permission.js` | ⏳ Chưa triển khai |
| `<PermissionGate>` | `app/components/PermissionGate.vue` | ⏳ Chưa triển khai |
| Middleware `permission` | `app/middleware/permission.js` | ⏳ Chưa triển khai |

Các mục ⏳ là **đặc tả** để triển khai; khi viết code phải tuân theo đúng API mô tả bên dưới.

---

## 0. QUY ƯỚC CHUNG CỦA BACKEND (theo spec `apidog-erp`)

### 0.1 Base URL & xác thực
- Base URL lấy từ `runtimeConfig.public.apiBase` (biến môi trường `NUXT_PUBLIC_API_BASE`), cấu hình trong `nuxt.config.ts`.
- Mọi path backend đều tương đối với base URL: `/health`, `/v1/platform/...`, `/v1/public/...`.
- Security scheme `BearerAuth`: header `Authorization: Bearer <access_token>`. Các endpoint `security: []` (login, refresh, health, tenant-resolve) không cần token.

### 0.2 Cấu trúc response chuẩn

```jsonc
// response.SuccessResponse — dùng cho chi tiết / tạo / cập nhật
{ "success": true, "message": "Thành công", "data": { /* ... */ } }

// response.SuccessListResponse — dùng cho danh sách có phân trang
{ "success": true, "message": "Thành công", "data": [ /* ... */ ],
  "meta": { "page": 1, "limit": 20, "total": 100 } }

// response.ErrorResponse — mọi lỗi 400 / 401 / 403 / 404 / 409 ...
{ "success": false, "message": "Dữ liệu đầu vào không hợp lệ",
  "error": { "code": "VALIDATION_FAILED", "message": "Dữ liệu đầu vào không hợp lệ", "details": {} } }
```

- Phân trang dùng query `page` và `limit` (không phải `pageSize`).
- `GET /health` là ngoại lệ: trả object tự do, `200` khi khỏe, `503` khi API/DB/Redis lỗi.

---

## I. HỆ THỐNG PHÂN QUYỀN (PERMISSION SYSTEM)

### Nguồn dữ liệu: `GET /v1/platform/me`
Response `data` (schema `auth.MeProfile`):

| Field | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `user` | `object` | Thông tin tài khoản hiện tại |
| `roles` | `string[]` | Mã vai trò |
| `permissions` | `string[]` | **Danh sách mã quyền (permission code)** người dùng đang có |
| `menus` | `AntDMenuNode[]` | Cây menu được phép hiển thị |

`menu.AntDMenuNode`: `id`, `key`, `label`, `path`, `icon`, `type`, `hidden`, `sort_order`, `badge_key`, `required_permission_code`, `children[]`.

> [!NOTE]
> Quyền là **mã quyền dạng chuỗi** (`permissions: string[]`), không phải mảng action theo từng link. Mỗi quyền trong catalog có `resource` + `action` + `code` (`catalog.CreatePermissionInput`). Luôn dùng đúng giá trị `code` backend trả về; spec chưa quy định định dạng code, nên không tự đặt tên.

Quy tắc kiểm tra:
- **Có quyền** ⇔ `permissions.includes(code)`.
- **Truy cập trang** ⇔ tìm node trong `menus` có `path` khớp route; nếu node có `required_permission_code` thì mã đó phải nằm trong `permissions`. Route không có trong `menus` → không có quyền truy cập.

### 1. Composable `usePermission()`
- **Tệp**: `app/composables/usePermission.js`
- **Dữ liệu**: lấy từ kết quả `GET /v1/platform/me` (lưu dùng chung qua `useState`, gọi một lần sau đăng nhập).

```js
const {
  hasPermission,     // (code: string) => boolean
  hasAnyPermission,  // (codes: string[]) => boolean
  hasAllPermissions, // (codes: string[]) => boolean
  canAccess,         // (path?: string) => boolean — mặc định route hiện tại, dựa trên menus + required_permission_code
  permissions,       // ComputedRef<string[]>
  menus,             // ComputedRef<AntDMenuNode[]>
} = usePermission();

const onCreate = () => {
  if (!hasPermission("<permission_code>")) {
    message.warning("Bạn không có quyền thực hiện thao tác này!");
    return;
  }
  // ...
};
```

### 2. Directive `v-permission`
- **Tệp**: `app/plugins/permission.js` (dùng lại `usePermission()`).

```html
<!-- 1 mã quyền: ẩn khỏi DOM nếu không có -->
<a-button type="primary" v-permission="'<permission_code>'">Thêm mới</a-button>

<!-- Disable thay vì ẩn -->
<a-button v-permission.disable="'<permission_code>'">Xóa</a-button>

<!-- Có ít nhất 1 trong các quyền -->
<a-button v-permission="['<code_a>', '<code_b>']">Thao tác</a-button>

<!-- Phải có đủ tất cả quyền -->
<a-button v-permission.all="['<code_a>', '<code_b>']">Duyệt</a-button>
```

### 3. Component `<PermissionGate>`
- **Tệp**: `app/components/PermissionGate.vue`
- **Props**: `code: string | string[]`, `all?: boolean`. Slot `default` khi có quyền, slot `#no-permission` khi không.

```html
<PermissionGate code="<permission_code>">
  <a-button type="primary">Phê duyệt</a-button>
  <template #no-permission>
    <a-tag color="red">Bạn chỉ có quyền xem</a-tag>
  </template>
</PermissionGate>
```

### 4. Route middleware `permission`
- **Tệp**: `app/middleware/permission.js`
- Nếu `canAccess(to.path)` là `false` → chuyển về `/`. Chưa đăng nhập → chuyển về `/login`.

```js
definePageMeta({ middleware: ["permission"] });
```

---

## II. QUY TRÌNH BỔ SUNG API MỚI

### Bước 1: Đọc spec qua MCP `apidog-erp`
`read_project_oas_w5ttxc` → `read_project_oas_ref_resources_w5ttxc` (path + schema `$ref`). Khi spec vừa cập nhật thì gọi `refresh_project_oas_w5ttxc` trước. Sinh type vào `app/types/api/<module>.ts`.

### Bước 2: Đăng ký trong `app/composables/useApi.js`

```js
export const useApi = () => {
  return {
    health: useCrudApi("/api/health"), // mock Nitro local; backend thật là "/health"

    // Ví dụ theo spec:
    platformMe: useCrudApi("/v1/platform/me"),
    platformMenusTree: useCrudApi("/v1/platform/menus/tree"),
    platformUsers: useCrudApi("/v1/platform/users"),
    platformRoles: useCrudApi("/v1/platform/roles"),
    organizations: useCrudApi("/v1/platform/organizations"),
  };
};
```

### Bước 3: Gọi API — chữ ký thực tế của `useCrudApi`

| Hàm | Chữ ký | Cơ chế | Trả về |
| --- | --- | --- | --- |
| `get` | `get(options?)` | `useFetch` (SSR, top-level) | `{ data, pending, error, refresh }` |
| `getClient` | `getClient(options?)` | `$fetch` | `{ data, error }` (Ref) |
| `post` | `post(body, options?)` | `$fetch` | `{ data, error }` |
| `put` | `put(body, options?)` | `$fetch` | `{ data, error }` |
| `patch` | `patch(body, options?)` | `$fetch` | `{ data, error }` |
| `delete` | `delete(options?)` | `$fetch` | `{ data, error }` |

`options` được truyền thẳng vào `useFetch` / `$fetch` (`query`, `key`, `headers`, ...).
Endpoint có path param (`/v1/platform/users/{id}/status`): dùng `useRequest().fetchClient(\`/v1/platform/users/${id}/status\`, { method: "PATCH", body })`, hoặc tạo `app/composables/api/use<Module>Api.ts` nếu module có nhiều endpoint con.

```js
const { platformUsers } = useApi();

// Danh sách (SuccessListResponse): query theo spec là page / limit / search / status / role_id
const page = ref(1);
const { data: usersRes, pending, refresh } = await platformUsers.get({
  key: "platform-users",
  query: { page, limit: 20 },
});
const users = computed(() => usersRes.value?.data ?? []);
const total = computed(() => usersRes.value?.meta?.total ?? 0);

// Tạo mới (201 / 400 / 409)
const { data, error } = await platformUsers.post(payload);
```

### Bước 4: Nguyên tắc Request Layer (`useRequest.js`)
- Tự gắn `baseURL` từ `runtimeConfig.public.apiBase`.
- Tự gắn `Authorization: Bearer <token>` (đọc cookie `token` / `access_token`).
- **Cần bổ sung khi làm auth:** khi gặp `401`, gọi `POST /v1/platform/auth/refresh`; refresh thất bại thì xóa token và chuyển về `/login`.

### Bước 5: Bảo vệ giao diện bằng phân quyền
Trang dùng API mới phải có `definePageMeta({ middleware: ["permission"] })`, và các nút tạo / sửa / xóa phải gắn `v-permission` với đúng `code` của quyền tương ứng.

---

## III. XÁC THỰC & MENU

### 1. API xác thực (tag `Platform Auth`)

| Method | Path | Body | Response `data` | Lỗi |
| --- | --- | --- | --- | --- |
| `POST` | `/v1/platform/auth/login` | `{ email, password, otp_code }` (`auth.LoginInput`) | `auth.LoginOutput` | 400, 401, 403 |
| `POST` | `/v1/platform/auth/refresh` | object `{ [key]: string }` (spec chưa nêu tên field) | `auth.LoginOutput` | 400, 401 |
| `POST` | `/v1/platform/auth/logout` | — (cần Bearer) | — | 401 |
| `GET` | `/v1/platform/me` | — | `auth.MeProfile` | 401 |

`auth.LoginOutput`: `access_token`, `refresh_token`, `expires_in` (giây, ví dụ `900`), `token_type` (`"Bearer"`).
`otp_code` dùng khi tài khoản bật MFA (TOTP): `/v1/platform/me/mfa/setup`, `/enable`, `/disable`.

### 2. API menu

| Method | Path | Mục đích |
| --- | --- | --- |
| `GET` | `/v1/platform/menus/tree` | Cây menu nền tảng (`AntDMenuNode[]`), lỗi 401 / 403 |
| `GET` | `/v1/platform/catalog/menus/tree` | Cây menu nền của Tenant |
| `POST` | `/v1/platform/catalog/menus` | Tạo node menu Tenant (`catalog.CreateMenuInput`) |
| `PUT` | `/v1/platform/catalog/menus/reorder` | Sắp xếp lại cây menu Tenant (`catalog.ReorderMenuItem`) |

Sidebar dùng `menus` từ `/v1/platform/me` (đã lọc theo quyền). Sau khi thêm / sửa / sắp xếp menu: `refresh()` dữ liệu bảng, rồi gọi lại `/v1/platform/me` để cập nhật sidebar.

### 3. Bóc dữ liệu an toàn

```js
const { extractApiData } = useApiError();
const tree = computed(() => extractApiData(menusRes) ?? []); // bóc { success, data } → data
```

---

## IV. XỬ LÝ LỖI API — `useApiError()`

- **Tệp**: `app/composables/useApiError.js`
- `extractApiData(resData)`: trả về `resData.data` nếu response có dạng `{ success, data }`, ngược lại trả nguyên `resData`.
- `handleApiError(resData, error, defaultMessage)`: có lỗi HTTP hoặc `success === false` thì gọi `message.error()` (antdv-next) và trả `true`.
  Thứ tự lấy thông điệp: `error.data.message` → `error.statusMessage` → `error.message` → `defaultMessage` (với lỗi nghiệp vụ là `resData.message`).

Mã lỗi theo spec cần xử lý: `400` (dữ liệu sai, xem `error.details`), `401` (hết phiên → refresh / login), `403` (không đủ quyền), `404`, `409` (trùng dữ liệu, ví dụ tạo user / subdomain), `503` (health).

```js
import { message } from "antdv-next";

const { platformUsers } = useApi();
const { handleApiError } = useApiError();

const handleCreate = async payload => {
  const { data, error } = await platformUsers.post(payload);
  if (handleApiError(data, error, "Tạo nhân sự thất bại!")) return;
  message.success(unref(data)?.message || "Thao tác thành công!");
  await refresh();
};

// Top-level useFetch
const { data: listRes, error: listError } = await platformUsers.get({ key: "platform-users" });
watch(listError, err => err && handleApiError(null, err, "Lỗi khi tải danh sách!"));
```

> [!NOTE]
> Import `message` / `notification` từ **`antdv-next`**, không phải `ant-design-vue`.

---

## V. LƯU Ý KỸ THUẬT (antdv-next + SSR)

- Component được auto-import với prefix `A` (`<AButton>` hoặc `<a-button>`), icon được auto-import (`antd.icon: true`).
- `ATable` và `AMenu mode="horizontal"` gây hydration mismatch khi render SSR → bọc trong `<ClientOnly>`.
- Nội dung chia tab có component nặng: dùng `v-if` thay cho `v-show` để không SSR các tab đang ẩn.
- Dùng prop mới của antdv-next: `AAlert title` (không dùng `message`), `items` + `content` cho `ASteps` / `ACollapse` / `ATimeline` / `ADescriptions`, `ADivider title-placement`, `v-model:open` cho `AModal` / `ADrawer`.

---

## VI. NGUYÊN TẮC PONYTAIL (LAZY SENIOR DEV MODE)

*"Đoạn code tốt nhất là đoạn code không bao giờ phải viết."*

### 1. Thang quyết định (Ladder of Laziness)
Dừng ở bậc đầu tiên thỏa mãn yêu cầu:
1. **YAGNI:** có thực sự cần không?
2. **Tái sử dụng:** đã có helper / composable / component trong dự án chưa? Dùng lại.
3. **Thư viện chuẩn / Web API.**
4. **Tính năng nền tảng Vue / Nuxt.**
5. **Dependency sẵn có** trong `package.json`.
6. **Gọn thành một dòng.**
7. Chỉ khi các bậc trên không đáp ứng mới viết code tối thiểu.

> Thang này áp dụng **sau khi** đã hiểu rõ vấn đề: đọc task và lần theo luồng dữ liệu đầu–cuối trước.

### 2. Sửa lỗi = sửa gốc rễ
Thông báo lỗi chỉ là triệu chứng. Tìm (`grep`) mọi nơi gọi hàm lỗi và sửa một lần ở hàm dùng chung.

### 3. Quy tắc cốt lõi
- Không tự tạo abstraction / wrapper khi không được yêu cầu.
- Không thêm dependency mới nếu package hiện có đã đáp ứng.
- Không viết boilerplate thừa.
- Xóa hơn thêm, nhàm chán hơn tinh vi, càng ít tệp càng tốt.
- Diff ngắn nhất mà chạy đúng sẽ thắng, với điều kiện đã hiểu vấn đề.
- Chất vấn yêu cầu phức tạp: có giải pháp đơn giản hơn không?

### 4. Không bao giờ lười ở các điểm sau
- Hiểu bản chất vấn đề.
- Validate input tại ranh giới tin cậy.
- Xử lý lỗi để tránh mất dữ liệu.
- Bảo mật, phân quyền, accessibility.
- Mọi yêu cầu người dùng đã nêu rõ.
