<template>
  <div class="space-y-4">
    <!-- Page Header & Toolbar -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
        <div>
          <ATypographyTitle :level="4" style="margin: 0">
            Quản lý Cây Menu Nền (Tenant Base Menu)
          </ATypographyTitle>
          <ATypographyText type="secondary" class="text-xs">
            Thiết lập cấu trúc menu mẫu, liên kết route, tính năng và mã quyền cho các trường học (Tenant)
          </ATypographyText>
        </div>

        <ASpace wrap>
          <AInput
            v-model:value="searchQuery"
            placeholder="Tìm theo tên, mã key, đường dẫn..."
            allow-clear
            class="w-64"
          >
            <template #prefix>
              <SearchOutlined class="text-slate-400" />
            </template>
          </AInput>

          <ASelect
            v-model:value="typeFilter"
            placeholder="Loại menu"
            allow-clear
            class="w-36"
            :options="menuTypeOptions"
          />

          <AButton @click="openRoutesDrawer">
            <template #icon><Icon name="ant-design:branches-outlined" /></template>
            Quản lý Routes
          </AButton>

          <AButton :loading="pending" @click="() => refreshTree()">
            <template #icon><ReloadOutlined /></template>
            Làm mới
          </AButton>

          <AButton type="primary" @click="openCreateModal()">
            <template #icon><PlusOutlined /></template>
            Thêm node menu
          </AButton>
        </ASpace>
      </AFlex>
    </ACard>

    <!-- Menu Tree Table -->
    <ACard class="!rounded-xl !border-slate-200/80 shadow-xs">
      <ClientOnly>
        <ATable
          :columns="columns"
          :data-source="displayedTree"
          :loading="pending || reordering"
          :pagination="false"
          row-key="id"
          size="middle"
          :scroll="{ x: 1100 }"
        >
          <template #bodyCell="{ column, record }">
            <!-- Label & Icon -->
            <template v-if="column.key === 'label'">
              <div class="flex items-center gap-2">
                <Icon
                  v-if="record.icon"
                  :name="resolveIconName(record.icon)"
                  class="text-base text-blue-600"
                />
                <span class="font-medium text-slate-800">{{ record.label }}</span>
                <ATag v-if="record.icon" color="default" class="!m-0 font-mono text-[11px]">
                  {{ record.icon }}
                </ATag>
                <ATag v-if="record.is_mandatory" color="purple" class="!m-0 text-[10px]">
                  Bắt buộc
                </ATag>
              </div>
            </template>

            <!-- Key & Type -->
            <template v-else-if="column.key === 'key'">
              <div class="space-y-1">
                <div class="font-mono text-xs text-slate-700">{{ record.key || "—" }}</div>
                <ATag
                  v-if="record.type"
                  :color="record.type === 'GROUP' ? 'blue' : record.type === 'ITEM' ? 'cyan' : 'geekblue'"
                  class="text-[11px]"
                >
                  {{ record.type }}
                </ATag>
              </div>
            </template>

            <!-- Path & Feature -->
            <template v-else-if="column.key === 'path'">
              <div class="space-y-1">
                <div v-if="record.path" class="font-mono text-xs text-blue-600">
                  {{ record.path }}
                </div>
                <span v-else class="text-xs text-slate-400">—</span>
                <div v-if="record.feature_code">
                  <ATag color="geekblue" class="text-[11px]">{{ record.feature_code }}</ATag>
                </div>
              </div>
            </template>

            <!-- Required Permissions -->
            <template v-else-if="column.key === 'permissions'">
              <div v-if="record.required_permissions?.length" class="flex flex-wrap items-center gap-1">
                <ATag v-if="record.permission_match_mode" color="orange" class="text-[10px]">
                  {{ record.permission_match_mode }}
                </ATag>
                <ATag
                  v-for="perm in record.required_permissions"
                  :key="perm"
                  class="font-mono text-[11px]"
                >
                  {{ perm }}
                </ATag>
              </div>
              <span v-else class="text-xs text-slate-400">Không yêu cầu</span>
            </template>

            <!-- Target Portals -->
            <template v-else-if="column.key === 'portals'">
              <div v-if="record.target_portals?.length" class="flex flex-wrap gap-1">
                <ATag v-for="portal in record.target_portals" :key="portal" color="green" class="text-[11px]">
                  {{ portal }}
                </ATag>
              </div>
              <span v-else class="text-xs text-slate-400">Tất cả</span>
            </template>

            <!-- Sort Order -->
            <template v-else-if="column.key === 'sort_order'">
              <ATag color="default" class="font-mono">{{ record.sort_order ?? 0 }}</ATag>
            </template>

            <!-- Status -->
            <template v-else-if="column.key === 'is_active'">
              <ATag :color="record.is_active !== false ? 'success' : 'error'">
                {{ record.is_active !== false ? "Hoạt động" : "Tắt" }}
              </ATag>
            </template>

            <!-- Actions -->
            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <ATooltip title="Thêm menu con">
                  <AButton size="small" type="dashed" @click="openCreateModal(record)">
                    <template #icon><PlusOutlined /></template>
                  </AButton>
                </ATooltip>

                <ATooltip title="Sửa thông tin menu">
                  <AButton size="small" @click="openEditMenuModal(record)">
                    <template #icon><EditOutlined /></template>
                  </AButton>
                </ATooltip>

                <ATooltip title="Đổi vị trí / Thứ tự (Reorder)">
                  <AButton size="small" @click="openReorderModal(record)">
                    <template #icon><Icon name="ant-design:drag-outlined" /></template>
                  </AButton>
                </ATooltip>

                <ATooltip title="Chuyển lên">
                  <AButton size="small" @click="moveSibling(record, -1)">
                    <template #icon><ArrowUpOutlined /></template>
                  </AButton>
                </ATooltip>

                <ATooltip title="Chuyển xuống">
                  <AButton size="small" @click="moveSibling(record, 1)">
                    <template #icon><ArrowDownOutlined /></template>
                  </AButton>
                </ATooltip>

                <APopconfirm
                  v-if="record.id && !record.children?.length"
                  title="Xóa node menu này?"
                  ok-text="Xóa"
                  cancel-text="Hủy"
                  @confirm="handleDeleteMenu(record)"
                >
                  <ATooltip title="Xóa menu">
                    <AButton size="small" danger>
                      <template #icon><Icon name="ant-design:delete-outlined" /></template>
                    </AButton>
                  </ATooltip>
                </APopconfirm>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ACard>

    <!-- Modal Tạo mới / Cập nhật Node Menu -->
    <AModal
      v-model:open="createModalOpen"
      :title="editingMenuId ? 'Cập nhật Node Menu Tenant' : 'Thêm mới Node Menu Tenant'"
      :width="680"
      :confirm-loading="submittingCreate"
      :ok-text="editingMenuId ? 'Lưu thay đổi' : 'Tạo menu'"
      cancel-text="Hủy"
      destroy-on-hidden
      @ok="handleCreateSubmit"
    >
      <AForm
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        layout="vertical"
        class="pt-2"
      >
        <ARow :gutter="16">
          <ACol :xs="24" :sm="12">
            <AFormItem label="Tên hiển thị (label)" name="label">
              <AInput v-model:value="createForm.label" placeholder="VD: Quản lý học sinh" allow-clear />
            </AFormItem>
          </ACol>

          <ACol :xs="24" :sm="12">
            <AFormItem label="Mã menu (menu_key)" name="menu_key">
              <AInput
                v-model:value="createForm.menu_key"
                placeholder="VD: student_management"
                :disabled="Boolean(editingMenuId)"
                allow-clear
              />
            </AFormItem>
          </ACol>

          <ACol :xs="24" :sm="8">
            <AFormItem label="Loại menu (menu_type)" name="menu_type">
              <ASelect v-model:value="createForm.menu_type" :options="menuTypeOptions" />
            </AFormItem>
          </ACol>

          <ACol :xs="24" :sm="8">
            <AFormItem label="Biểu tượng (icon)" name="icon">
              <AInput v-model:value="createForm.icon" placeholder="VD: UserOutlined" allow-clear>
                <template #prefix>
                  <Icon :name="resolveIconName(createForm.icon)" class="text-slate-600" />
                </template>
              </AInput>
            </AFormItem>
          </ACol>

          <ACol :xs="24" :sm="8">
            <AFormItem label="Thứ tự (sort_order)" name="sort_order">
              <AInputNumber v-model:value="createForm.sort_order" :min="0" style="width: 100%" />
            </AFormItem>
          </ACol>

          <ACol :span="24">
            <AFormItem label="Menu cha (parent_id)" name="parent_id">
              <ASelect
                v-model:value="createForm.parent_id"
                placeholder="-- Cấp gốc (Root) --"
                allow-clear
                show-search
                option-filter-prop="label"
                :options="parentNodeOptions"
              />
            </AFormItem>
          </ACol>

          <ACol :xs="24" :sm="12">
            <AFormItem label="Tính năng liên kết (feature_id)" name="feature_id">
              <ASelect
                v-model:value="createForm.feature_id"
                placeholder="Chọn tính năng"
                allow-clear
                show-search
                option-filter-prop="label"
                :loading="loadingCatalogRefs"
                :options="featureOptions"
              />
            </AFormItem>
          </ACol>

          <ACol :xs="24" :sm="12">
            <AFormItem label="Route liên kết (route_id)" name="route_id">
              <ASelect
                v-model:value="createForm.route_id"
                placeholder="Chọn route"
                allow-clear
                show-search
                option-filter-prop="label"
                :loading="loadingCatalogRefs"
                :options="filteredRouteOptions"
              />
            </AFormItem>
          </ACol>

          <ACol :xs="24" :sm="8">
            <AFormItem label="Chế độ khớp quyền" name="permission_match_mode">
              <ASelect v-model:value="createForm.permission_match_mode" :options="permissionMatchOptions" />
            </AFormItem>
          </ACol>

          <ACol :xs="24" :sm="16">
            <AFormItem label="Danh sách mã quyền yêu cầu (required_permissions)" name="required_permissions">
              <ASelect
                v-model:value="createForm.required_permissions"
                mode="tags"
                placeholder="Chọn hoặc nhập mã quyền"
                allow-clear
                :loading="loadingCatalogRefs"
                :options="permissionOptions"
              />
            </AFormItem>
          </ACol>

          <ACol :span="24">
            <AFormItem label="Portals đích (target_portals)" name="target_portals">
              <ASelect
                v-model:value="createForm.target_portals"
                mode="tags"
                placeholder="Chọn hoặc nhập portal (VD: SCHOOL_ADMIN, TEACHER...)"
                allow-clear
                :options="portalOptions"
              />
            </AFormItem>
          </ACol>

          <ACol :xs="12" :sm="8">
            <AFormItem label="Kích hoạt (is_active)" name="is_active">
              <ASwitch v-model:checked="createForm.is_active" checked-children="Bật" un-checked-children="Tắt" />
            </AFormItem>
          </ACol>

          <ACol :xs="12" :sm="8">
            <AFormItem label="Bắt buộc (is_mandatory)" name="is_mandatory">
              <ASwitch v-model:checked="createForm.is_mandatory" checked-children="Có" un-checked-children="Không" />
            </AFormItem>
          </ACol>
        </ARow>
      </AForm>
    </AModal>

    <!-- Modal Chỉnh sửa vị trí & Thứ tự (PUT /v1/platform/catalog/menus/reorder) -->
    <AModal
      v-model:open="reorderModalOpen"
      title="Chỉnh sửa vị trí & thứ tự hiển thị"
      :width="480"
      :confirm-loading="reordering"
      ok-text="Lưu thay đổi"
      cancel-text="Hủy"
      destroy-on-hidden
      @ok="handleReorderSubmit"
    >
      <AForm layout="vertical" class="pt-2">
        <AFormItem label="Node menu đang chọn">
          <AInput :value="editingNode?.label || ''" disabled />
        </AFormItem>

        <AFormItem label="Menu cha (parent_id)">
          <ASelect
            v-model:value="reorderForm.parent_id"
            placeholder="-- Cấp gốc (Root) --"
            allow-clear
            show-search
            option-filter-prop="label"
            :options="reorderParentOptions"
          />
        </AFormItem>

        <AFormItem label="Thứ tự hiển thị (sort_order)">
          <AInputNumber v-model:value="reorderForm.sort_order" :min="0" style="width: 100%" />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- Drawer Quản lý Tenant Routes (/v1/platform/catalog/routes) -->
    <ADrawer v-model:open="routesDrawerOpen" title="Quản lý Tenant Routes (Catalog)" :size="860">
      <div class="mb-3 flex items-center justify-between gap-2">
        <span class="text-xs text-slate-500">Khai báo đường dẫn giao diện Tenant để liên kết với Menu nền</span>
        <ASpace>
          <AButton size="small" :loading="loadingCatalogRefs" @click="loadCatalogReferences(true)">
            Làm mới
          </AButton>
          <AButton size="small" type="primary" @click="openRouteModal()">
            <template #icon><PlusOutlined /></template>
            Thêm Route
          </AButton>
        </ASpace>
      </div>

      <ClientOnly>
        <ATable
          :columns="routeColumns"
          :data-source="routesList"
          :loading="loadingCatalogRefs"
          :pagination="{ pageSize: 12 }"
          row-key="id"
          size="small"
          :scroll="{ x: 760 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'route'">
              <div class="font-medium text-slate-800">{{ record.name || "—" }}</div>
              <div class="font-mono text-xs text-slate-500">{{ record.route_key }}</div>
            </template>
            <template v-else-if="column.key === 'path'">
              <span class="font-mono text-xs text-blue-600">{{ record.path }}</span>
            </template>
            <template v-else-if="column.key === 'feature'">
              <span class="text-xs text-slate-600">{{ featureNameById(record.feature_id) }}</span>
            </template>
            <template v-else-if="column.key === 'is_active'">
              <ATag :color="record.is_active !== false ? 'success' : 'error'">
                {{ record.is_active !== false ? "Bật" : "Tắt" }}
              </ATag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <ASpace size="small">
                <AButton size="small" @click="openRouteModal(record)">Sửa</AButton>
                <APopconfirm
                  v-if="record.id"
                  title="Xóa route này? (Sẽ bị chặn nếu đang được menu tham chiếu)"
                  ok-text="Xóa"
                  cancel-text="Hủy"
                  @confirm="handleDeleteRoute(record)"
                >
                  <AButton size="small" danger>Xóa</AButton>
                </APopconfirm>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ClientOnly>
    </ADrawer>

    <!-- Modal Tạo / Sửa Route -->
    <AModal
      v-model:open="routeModalOpen"
      :title="editingRouteId ? 'Cập nhật Tenant Route' : 'Thêm mới Tenant Route'"
      :confirm-loading="savingRoute"
      :ok-text="editingRouteId ? 'Lưu thay đổi' : 'Tạo Route'"
      cancel-text="Hủy"
      @ok="submitRoute"
    >
      <AForm ref="routeFormRef" :model="routeForm" :rules="routeRules" layout="vertical" class="mt-3">
        <AFormItem label="Mã Route (route_key)" name="route_key">
          <AInput v-model:value="routeForm.route_key" placeholder="finance.invoices" class="font-mono" />
        </AFormItem>
        <AFormItem label="Tên hiển thị" name="name">
          <AInput v-model:value="routeForm.name" placeholder="Quản lý Hóa đơn" />
        </AFormItem>
        <AFormItem label="Đường dẫn (path)" name="path">
          <AInput v-model:value="routeForm.path" placeholder="/finance/invoices" class="font-mono" />
        </AFormItem>
        <AFormItem label="Tính năng liên kết (feature_id)" name="feature_id">
          <ASelect
            v-model:value="routeForm.feature_id"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="Chọn tính năng"
            :options="featureOptions"
          />
        </AFormItem>
        <AFormItem label="Kích hoạt (is_active)" name="is_active" class="!mb-0">
          <ASwitch v-model:checked="routeForm.is_active" checked-children="Bật" un-checked-children="Tắt" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule, TableProps } from "antdv-next";
import { useCatalogApi } from "~/composables/api/useCatalogApi";
import type {
  CatalogFeature,
  CreateMenuInput,
  CreateRouteInput,
  ReorderMenuItem,
  TenantMenuTreeNode,
  TenantPermission,
  TenantRoute,
} from "~/types/api/catalog";

definePageMeta({
  middleware: ["permission"],
});

useHead({
  title: "Quản lý Menu Nền | School ERP",
});

const userStore = useUserStore();
const { resolveIconName } = useMenu();
const catalogApi = useCatalogApi();
const {
  catalogMenusTree,
  catalogMenus,
  catalogMenusReorder,
  catalogFeatures,
  catalogRoutes,
  catalogPermissions,
} = useApi();
const { extractApiData, handleApiError } = useApiError();

// 1. Tải cây menu từ GET /v1/platform/catalog/menus/tree
const {
  data: treeRes,
  pending,
  refresh: refreshTree,
  error: treeError,
} = await catalogMenusTree.get({
  key: "catalog-menus-tree",
});

watch(
  () => unref(treeError),
  (err) => {
    if (err) handleApiError(null, err, "Không thể tải cây menu nền!");
  },
);

const rawTree = computed<TenantMenuTreeNode[]>(() => {
  const data = extractApiData(treeRes);
  return Array.isArray(data) ? data : [];
});

// Chuẩn hóa cây để ATable chỉ hiện mũi tên mở rộng khi có children thực sự
const normalizeNodes = (nodes: TenantMenuTreeNode[]): TenantMenuTreeNode[] =>
  [...nodes]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((n) => ({
      ...n,
      children: n.children?.length ? normalizeNodes(n.children) : undefined,
    }));

const searchQuery = ref("");
const typeFilter = ref<string | undefined>(undefined);

const filterTree = (nodes: TenantMenuTreeNode[]): TenantMenuTreeNode[] => {
  const q = searchQuery.value.trim().toLowerCase();
  const t = typeFilter.value;

  if (!q && !t) return normalizeNodes(nodes);

  return nodes.reduce<TenantMenuTreeNode[]>((acc, node) => {
    const filteredChildren = node.children?.length ? filterTree(node.children) : [];
    const matchQuery =
      !q ||
      node.label?.toLowerCase().includes(q) ||
      node.key?.toLowerCase().includes(q) ||
      node.path?.toLowerCase().includes(q);
    const matchType = !t || node.type === t;

    if ((matchQuery && matchType) || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : undefined,
      });
    }
    return acc;
  }, []);
};

const displayedTree = computed(() => filterTree(rawTree.value));

// Trải phẳng cây để làm options chọn menu cha & tính toán reorder
const flattenTree = (
  nodes: TenantMenuTreeNode[],
  depth = 0,
): Array<TenantMenuTreeNode & { depth: number }> =>
  nodes.flatMap((n) => [
    { ...n, depth },
    ...(n.children?.length ? flattenTree(n.children, depth + 1) : []),
  ]);

const flatNodes = computed(() => flattenTree(rawTree.value));

const parentNodeOptions = computed(() =>
  flatNodes.value
    .filter((n) => n.id)
    .map((n) => ({
      value: n.id!,
      label: `${"— ".repeat(n.depth)}${n.label || n.key} (${n.key || n.type || "node"})`,
    })),
);

const menuTypeOptions = [
  { label: "GROUP (Nhóm)", value: "GROUP" },
  { label: "ITEM (Mục menu)", value: "ITEM" },
  { label: "LINK (Liên kết)", value: "LINK" },
];

const permissionMatchOptions = [
  { label: "ANY (Có ít nhất 1 quyền)", value: "ANY" },
  { label: "ALL (Có đủ tất cả quyền)", value: "ALL" },
];

const portalOptions = [
  { label: "SCHOOL_ADMIN", value: "SCHOOL_ADMIN" },
  { label: "TEACHER", value: "TEACHER" },
  { label: "STUDENT", value: "STUDENT" },
  { label: "PARENT", value: "PARENT" },
];

const columns: TableProps<TenantMenuTreeNode>["columns"] = [
  { title: "Tên menu", dataIndex: "label", key: "label", width: 260 },
  { title: "Mã & Loại", dataIndex: "key", key: "key", width: 160 },
  { title: "Đường dẫn & Feature", dataIndex: "path", key: "path", width: 200 },
  { title: "Quyền yêu cầu", key: "permissions", width: 200 },
  { title: "Portals", key: "portals", width: 140 },
  { title: "Thứ tự", dataIndex: "sort_order", key: "sort_order", width: 85, align: "center" },
  { title: "Trạng thái", dataIndex: "is_active", key: "is_active", width: 110, align: "center" },
  { title: "Thao tác", key: "actions", width: 220, fixed: "right" },
];

// 2. Dữ liệu tham chiếu Catalog (Features, Routes, Permissions)
const loadingCatalogRefs = ref(false);
const featuresList = ref<CatalogFeature[]>([]);
const routesList = ref<TenantRoute[]>([]);
const permissionsList = ref<TenantPermission[]>([]);
const refsLoaded = ref(false);

const loadCatalogReferences = async (force = false) => {
  if (refsLoaded.value && !force) return;
  loadingCatalogRefs.value = true;
  try {
    const [featRes, routeRes, permRes] = await Promise.all([
      catalogFeatures.getClient(),
      catalogRoutes.getClient(),
      catalogPermissions.getClient(),
    ]);
    const feats = extractApiData(featRes.data);
    const routes = extractApiData(routeRes.data);
    const perms = extractApiData(permRes.data);

    featuresList.value = Array.isArray(feats) ? feats : [];
    routesList.value = Array.isArray(routes) ? routes : [];
    permissionsList.value = Array.isArray(perms) ? perms : [];
    refsLoaded.value = true;
  } finally {
    loadingCatalogRefs.value = false;
  }
};

const featureOptions = computed(() =>
  featuresList.value
    .filter((f) => f.id)
    .map((f) => ({
      value: f.id!,
      label: `${f.name || f.code} (${f.code})`,
    })),
);

const filteredRouteOptions = computed(() =>
  routesList.value
    .filter((r) => r.id && (!createForm.feature_id || r.feature_id === createForm.feature_id))
    .map((r) => ({
      value: r.id!,
      label: `${r.name || r.route_key} — ${r.path}`,
    })),
);

const permissionOptions = computed(() =>
  permissionsList.value
    .filter((p) => p.code)
    .map((p) => ({
      value: p.code!,
      label: `${p.code}${p.name ? ` — ${p.name}` : ""}`,
    })),
);

// 3. Tạo mới / Cập nhật / Xóa Node Menu
const createModalOpen = ref(false);
const submittingCreate = ref(false);
const editingMenuId = ref<string | null>(null);
const createFormRef = ref<FormInstance>();

const getInitialCreateForm = (parentNode?: TenantMenuTreeNode): CreateMenuInput => ({
  label: "",
  menu_key: "",
  menu_type: "ITEM",
  icon: "",
  parent_id: parentNode?.id || undefined,
  feature_id: parentNode?.feature_id || undefined,
  route_id: undefined,
  sort_order: 0,
  is_active: true,
  is_mandatory: false,
  permission_match_mode: "ANY",
  required_permissions: [],
  target_portals: parentNode?.target_portals?.length ? [...parentNode.target_portals] : [],
});

const createForm = reactive<CreateMenuInput>(getInitialCreateForm());

const createRules: Record<string, Rule[]> = {
  label: [{ required: true, message: "Vui lòng nhập tên hiển thị menu", trigger: "blur" }],
  menu_key: [{ required: true, message: "Vui lòng nhập mã menu_key", trigger: "blur" }],
};

const openCreateModal = (parentNode?: TenantMenuTreeNode) => {
  editingMenuId.value = null;
  Object.assign(createForm, getInitialCreateForm(parentNode));
  createModalOpen.value = true;
  loadCatalogReferences();
};

const openEditMenuModal = (node: TenantMenuTreeNode) => {
  if (!node.id) return;
  editingMenuId.value = node.id;
  Object.assign(createForm, {
    label: node.label || "",
    menu_key: node.key || "",
    menu_type: node.type || "ITEM",
    icon: node.icon || "",
    parent_id: node.parent_id || undefined,
    feature_id: node.feature_id || undefined,
    route_id: node.route_id || undefined,
    sort_order: node.sort_order ?? 0,
    is_active: node.is_active ?? true,
    is_mandatory: node.is_mandatory ?? false,
    permission_match_mode: node.permission_match_mode || "ANY",
    required_permissions: node.required_permissions ? [...node.required_permissions] : [],
    target_portals: node.target_portals ? [...node.target_portals] : [],
  });
  createModalOpen.value = true;
  loadCatalogReferences();
};

const handleCreateSubmit = async () => {
  try {
    await createFormRef.value?.validate();
  } catch {
    return;
  }

  submittingCreate.value = true;
  try {
    const common = {
      label: createForm.label.trim(),
      menu_type: createForm.menu_type,
      icon: createForm.icon?.trim() || undefined,
      parent_id: createForm.parent_id || undefined,
      feature_id: createForm.feature_id || undefined,
      route_id: createForm.route_id || undefined,
      sort_order: Number(createForm.sort_order ?? 0),
      is_active: createForm.is_active,
      is_mandatory: createForm.is_mandatory,
      permission_match_mode: createForm.permission_match_mode,
      required_permissions: createForm.required_permissions?.length
        ? createForm.required_permissions
        : [],
      target_portals: createForm.target_portals?.length ? createForm.target_portals : [],
    };

    const { data, error } = editingMenuId.value
      ? await catalogApi.updateMenu(editingMenuId.value, common)
      : await catalogMenus.post({
          ...common,
          menu_key: createForm.menu_key.trim(),
          required_permissions: common.required_permissions.length ? common.required_permissions : undefined,
          target_portals: common.target_portals.length ? common.target_portals : undefined,
        });

    if (handleApiError(data, error, editingMenuId.value ? "Cập nhật node menu thất bại!" : "Tạo node menu thất bại!")) {
      return;
    }

    message.success(editingMenuId.value ? "Cập nhật node menu thành công!" : "Tạo node menu thành công!");
    createModalOpen.value = false;
    await refreshTree();
    await userStore.fetchMe(true);
  } finally {
    submittingCreate.value = false;
  }
};

const handleDeleteMenu = async (node: TenantMenuTreeNode) => {
  if (!node.id) return;
  const { data, error } = await catalogApi.deleteMenu(node.id);
  if (handleApiError(data, error, "Xóa node menu thất bại!")) return;
  message.success((unref(data) as { message?: string } | null)?.message || "Đã xóa node menu!");
  await refreshTree();
  await userStore.fetchMe(true);
};

// 3b. Quản lý Tenant Routes (/v1/platform/catalog/routes)
const routesDrawerOpen = ref(false);
const routeModalOpen = ref(false);
const savingRoute = ref(false);
const editingRouteId = ref<string | null>(null);
const routeFormRef = ref<FormInstance>();

const routeForm = reactive<Required<CreateRouteInput> & { feature_id: string | undefined }>({
  route_key: "",
  name: "",
  path: "",
  feature_id: undefined,
  is_active: true,
});

const routeRules: Record<string, Rule[]> = {
  route_key: [{ required: true, message: "Vui lòng nhập route_key", trigger: "blur" }],
  name: [{ required: true, message: "Vui lòng nhập tên route", trigger: "blur" }],
  path: [{ required: true, message: "Vui lòng nhập path", trigger: "blur" }],
};

const routeColumns: TableProps["columns"] = [
  { title: "Route", key: "route", width: 210 },
  { title: "Path", key: "path", width: 180 },
  { title: "Tính năng", key: "feature", width: 160 },
  { title: "Trạng thái", key: "is_active", width: 90, align: "center" },
  { title: "Thao tác", key: "actions", width: 120, fixed: "right" },
];

const featureNameById = (featureId?: string) => {
  if (!featureId) return "—";
  const feat = featuresList.value.find((f) => f.id === featureId);
  return feat ? feat.name || feat.code || featureId : featureId;
};

const openRoutesDrawer = () => {
  routesDrawerOpen.value = true;
  loadCatalogReferences();
};

const openRouteModal = (record?: TenantRoute) => {
  if (record?.id) {
    editingRouteId.value = record.id;
    routeForm.route_key = record.route_key || "";
    routeForm.name = record.name || "";
    routeForm.path = record.path || "";
    routeForm.feature_id = record.feature_id || undefined;
    routeForm.is_active = record.is_active ?? true;
  } else {
    editingRouteId.value = null;
    routeForm.route_key = "";
    routeForm.name = "";
    routeForm.path = "";
    routeForm.feature_id = undefined;
    routeForm.is_active = true;
  }
  routeModalOpen.value = true;
};

const submitRoute = async () => {
  try {
    await routeFormRef.value?.validate();
  } catch {
    return;
  }

  savingRoute.value = true;
  try {
    const payload: CreateRouteInput = {
      route_key: routeForm.route_key.trim(),
      name: routeForm.name.trim(),
      path: routeForm.path.trim(),
      feature_id: routeForm.feature_id || undefined,
      is_active: routeForm.is_active,
    };
    const { data, error } = editingRouteId.value
      ? await catalogApi.updateRoute(editingRouteId.value, payload)
      : await catalogApi.createRoute(payload);

    if (handleApiError(data, error, editingRouteId.value ? "Cập nhật Route thất bại!" : "Tạo Route thất bại!")) {
      return;
    }
    message.success(editingRouteId.value ? "Cập nhật Route thành công!" : "Tạo Route thành công!");
    routeModalOpen.value = false;
    await loadCatalogReferences(true);
  } finally {
    savingRoute.value = false;
  }
};

const handleDeleteRoute = async (record: TenantRoute) => {
  if (!record.id) return;
  const { data, error } = await catalogApi.deleteRoute(record.id);
  if (handleApiError(data, error, "Xóa Route thất bại!")) return;
  message.success((unref(data) as { message?: string } | null)?.message || "Đã xóa Route!");
  await loadCatalogReferences(true);
};

// 4. Chỉnh sửa vị trí & Sắp xếp (PUT /v1/platform/catalog/menus/reorder)
const reorderModalOpen = ref(false);
const reordering = ref(false);
const editingNode = ref<TenantMenuTreeNode | null>(null);
const reorderForm = reactive<{ parent_id?: string; sort_order: number }>({
  parent_id: undefined,
  sort_order: 0,
});

const reorderParentOptions = computed(() =>
  parentNodeOptions.value.filter((opt) => opt.value !== editingNode.value?.id),
);

const openReorderModal = (node: TenantMenuTreeNode) => {
  editingNode.value = node;
  reorderForm.parent_id = node.parent_id || undefined;
  reorderForm.sort_order = node.sort_order ?? 0;
  reorderModalOpen.value = true;
};

const submitReorderItems = async (items: ReorderMenuItem[]) => {
  reordering.value = true;
  try {
    const { data, error } = await catalogMenusReorder.put(items);
    if (handleApiError(data, error, "Cập nhật thứ tự menu thất bại!")) return false;

    message.success("Đã cập nhật vị trí menu!");
    await refreshTree();
    await userStore.fetchMe(true);
    return true;
  } finally {
    reordering.value = false;
  }
};

const handleReorderSubmit = async () => {
  if (!editingNode.value?.id) return;
  const ok = await submitReorderItems([
    {
      id: editingNode.value.id,
      parent_id: reorderForm.parent_id || undefined,
      sort_order: Number(reorderForm.sort_order ?? 0),
    },
  ]);
  if (ok) reorderModalOpen.value = false;
};

const moveSibling = async (node: TenantMenuTreeNode, delta: -1 | 1) => {
  if (!node.id) return;
  const siblings = flatNodes.value
    .filter((n) => (n.parent_id || "") === (node.parent_id || "") && n.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const idx = siblings.findIndex((s) => s.id === node.id);
  const swapIdx = idx + delta;
  if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return;

  const reordered = [...siblings];
  const [moved] = reordered.splice(idx, 1);
  reordered.splice(swapIdx, 0, moved!);

  const payload: ReorderMenuItem[] = reordered.map((item, i) => ({
    id: item.id!,
    parent_id: item.parent_id || undefined,
    sort_order: i + 1,
  }));

  await submitReorderItems(payload);
};
</script>
