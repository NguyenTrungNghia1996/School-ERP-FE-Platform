<template>
  <div class="min-h-screen bg-slate-50 p-6">
    <div class="mx-auto max-w-6xl space-y-6">
      <ACard>
        <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
          <div>
            <ATypographyTitle :level="2" style="margin: 0">
              Antdv Next Playground
            </ATypographyTitle>
            <ATypographyText type="secondary">
              Kiểm thử các nhóm component chính của antdv-next trên Nuxt 4
            </ATypographyText>
          </div>
          <ASpace>
            <ATag color="blue">Nuxt 4.6.4</ATag>
            <ATag color="green">antdv-next 1.8.1</ATag>
          </ASpace>
        </AFlex>
      </ACard>

      <ACard>
        <ATabs v-model:activeKey="activeGroupTab" :items="groupTabItems" />

        <!-- 1. General & Layout -->
        <div v-if="activeGroupTab === 'general'" class="space-y-6 pt-2">
          <ADivider title-placement="left">AButton</ADivider>
          <ASpace wrap>
            <AButton type="primary">Primary</AButton>
            <AButton type="dashed">Dashed</AButton>
            <AButton type="primary" :loading="btnLoading" @click="triggerBtnLoading">
              {{ btnLoading ? "Đang tải..." : "Click Loading" }}
            </AButton>
            <AButton type="primary">
              <template #icon>
                <SearchOutlined />
              </template>
              Tìm kiếm
            </AButton>
            <AButton danger>Danger</AButton>
          </ASpace>

          <ADivider title-placement="left" variant="dashed">ATypography</ADivider>
          <div class="space-y-2">
            <ATypographyTitle :level="4" style="margin: 0">Tiêu đề cấp 4 (ATypographyTitle)</ATypographyTitle>
            <ATypographyParagraph>
              Đây là đoạn văn bản mẫu sử dụng <ATypographyText strong>ATypographyText strong</ATypographyText>,
              <ATypographyText code>code</ATypographyText>, <ATypographyText type="warning">warning</ATypographyText> và
              <ATypographyLink href="https://www.antdv-next.com/" target="_blank">ATypographyLink</ATypographyLink>.
            </ATypographyParagraph>
          </div>

          <ADivider title-placement="left">AFlex &amp; ASpace</ADivider>
          <AFlex justify="space-between" align="center" class="rounded border border-slate-200 bg-slate-100 p-4">
            <ASpace>
              <ATag color="processing">Trái 1</ATag>
              <ATag color="success">Trái 2</ATag>
            </ASpace>
            <AButton size="small">Phải</AButton>
          </AFlex>

          <ADivider title-placement="left">AGrid (ARow / ACol)</ADivider>
          <ARow :gutter="[16, 16]">
            <ACol :xs="24" :md="8">
              <div class="rounded bg-blue-100 p-4 text-center font-medium text-blue-800">Col 1 (xs=24, md=8)</div>
            </ACol>
            <ACol :xs="24" :md="8">
              <div class="rounded bg-emerald-100 p-4 text-center font-medium text-emerald-800">Col 2 (xs=24, md=8)</div>
            </ACol>
            <ACol :xs="24" :md="8">
              <div class="rounded bg-amber-100 p-4 text-center font-medium text-amber-800">Col 3 (xs=24, md=8)</div>
            </ACol>
          </ARow>
        </div>

        <!-- 2. Navigation -->
        <div v-if="activeGroupTab === 'navigation'" class="space-y-6 pt-2">
          <ADivider title-placement="left">AMenu</ADivider>
          <AMenu v-model:selectedKeys="menuSelectedKeys" mode="horizontal" :items="menuItems" />

          <ADivider title-placement="left">ABreadcrumb</ADivider>
          <ABreadcrumb :items="breadcrumbItems" />

          <ADivider title-placement="left">ATabs</ADivider>
          <ATabs v-model:activeKey="subTabKey" type="card" :items="subTabItems" />

          <ADivider title-placement="left">ASteps</ADivider>
          <div class="space-y-4">
            <ASteps :current="currentStep" :items="stepItems" />
            <ASpace>
              <AButton :disabled="currentStep <= 0" @click="currentStep--">Quay lại</AButton>
              <AButton type="primary" :disabled="currentStep >= stepItems.length - 1" @click="currentStep++">Tiếp theo</AButton>
            </ASpace>
          </div>

          <ADivider title-placement="left">ADropdown &amp; APagination</ADivider>
          <AFlex justify="space-between" align="center" wrap="wrap" gap="middle">
            <ADropdown :menu="{ items: dropdownItems, onClick: handleDropdownClick }">
              <AButton>
                Thao tác
                <DownOutlined />
              </AButton>
            </ADropdown>
            <APagination v-model:current="currentPage" v-model:pageSize="pageSize" :total="50" show-size-changer />
          </AFlex>
        </div>

        <!-- 3. Data Entry (Form) -->
        <div v-if="activeGroupTab === 'form'" class="pt-2">
          <AForm ref="formRef" :model="formState" :rules="formRules" layout="vertical" @finish="onFormFinish">
            <ARow :gutter="16">
              <ACol :xs="24" :md="12">
                <AFormItem label="Họ và tên (AInput)" name="fullName">
                  <AInput v-model:value="formState.fullName" placeholder="Nhập họ và tên" allow-clear />
                </AFormItem>
              </ACol>
              <ACol :xs="24" :md="12">
                <AFormItem label="Tuổi (AInputNumber)" name="age">
                  <AInputNumber v-model:value="formState.age" :min="1" :max="120" style="width: 100%" />
                </AFormItem>
              </ACol>
              <ACol :xs="24" :md="12">
                <AFormItem label="Môn học (ASelect - tìm kiếm & chọn nhiều)" name="subjects">
                  <ASelect
                    v-model:value="formState.subjects"
                    mode="multiple"
                    show-search
                    allow-clear
                    placeholder="Chọn môn học"
                    :options="subjectOptions"
                  />
                </AFormItem>
              </ACol>
              <ACol :xs="24" :md="12">
                <AFormItem label="Ngày nhập học (ADatePicker)" name="enrollDate">
                  <ADatePicker v-model:value="formState.enrollDate" style="width: 100%" placeholder="Chọn ngày" />
                </AFormItem>
              </ACol>
              <ACol :xs="24" :md="8">
                <AFormItem label="Trạng thái kích hoạt (ASwitch)" name="active">
                  <ASwitch v-model:checked="formState.active" checked-children="Bật" un-checked-children="Tắt" />
                </AFormItem>
              </ACol>
              <ACol :xs="24" :md="16">
                <AFormItem label="Mức độ ưu tiên (ASlider)" name="priority">
                  <ASlider v-model:value="formState.priority" :min="0" :max="100" />
                </AFormItem>
              </ACol>
              <ACol :xs="24" :md="12">
                <AFormItem label="Giới tính (ARadio)" name="gender">
                  <ARadioGroup v-model:value="formState.gender">
                    <ARadio value="male">Nam</ARadio>
                    <ARadio value="female">Nữ</ARadio>
                    <ARadio value="other">Khác</ARadio>
                  </ARadioGroup>
                </AFormItem>
              </ACol>
              <ACol :xs="24" :md="12">
                <AFormItem label="Kỹ năng (ACheckbox)" name="skills">
                  <ACheckboxGroup v-model:value="formState.skills" :options="skillOptions" />
                </AFormItem>
              </ACol>
              <ACol :span="24">
                <AFormItem label="Tệp đính kèm (AUpload)" name="files">
                  <AUpload v-model:file-list="formState.files" :before-upload="() => false">
                    <AButton>
                      <template #icon>
                        <UploadOutlined />
                      </template>
                      Chọn tệp
                    </AButton>
                  </AUpload>
                </AFormItem>
              </ACol>
            </ARow>
            <ASpace>
              <AButton type="primary" html-type="submit">Gửi biểu mẫu</AButton>
              <AButton @click="resetForm">Đặt lại</AButton>
            </ASpace>
          </AForm>
        </div>

        <!-- 4. Data Display -->
        <div v-if="activeGroupTab === 'display'" class="space-y-6 pt-2">
          <ADivider title-placement="left">AStatistic, AAvatar &amp; ABadge</ADivider>
          <ARow :gutter="[16, 16]" align="middle">
            <ACol :xs="12" :md="6">
              <ACard size="small">
                <AStatistic title="Tổng học sinh" :value="1280" />
              </ACard>
            </ACol>
            <ACol :xs="12" :md="6">
              <ACard size="small">
                <AStatistic title="Tỉ lệ chuyên cần" :value="98.5" suffix="%" />
              </ACard>
            </ACol>
            <ACol :xs="24" :md="12">
              <ASpace size="large">
                <ABadge :count="5">
                  <AAvatar shape="square" size="large">
                    <template #icon><UserOutlined /></template>
                  </AAvatar>
                </ABadge>
                <ABadge dot status="processing">
                  <AAvatar style="background-color: #004aad">AD</AAvatar>
                </ABadge>
                <AQrcode value="https://www.antdv-next.com/" :size="88" />
              </ASpace>
            </ACol>
          </ARow>

          <ADivider title-placement="left">ATable (Phân trang, Sắp xếp, ATag)</ADivider>
          <ATable :columns="tableColumns" :data-source="tableData" :pagination="{ pageSize: 3 }" row-key="id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <ATag :color="record.status === 'active' ? 'success' : record.status === 'pending' ? 'warning' : 'error'">
                  {{ record.status === "active" ? "Đang học" : record.status === "pending" ? "Chờ duyệt" : "Tạm nghỉ" }}
                </ATag>
              </template>
            </template>
          </ATable>

          <ADivider title-placement="left">ADescriptions</ADivider>
          <ADescriptions title="Thông tin trường học" bordered :column="{ xs: 1, sm: 2, md: 3 }" :items="descriptionItems" />

          <ARow :gutter="[16, 16]">
            <ACol :xs="24" :md="12">
              <ADivider title-placement="left">ACollapse</ADivider>
              <ACollapse v-model:activeKey="collapseActiveKey" :items="collapseItems" />
            </ACol>
            <ACol :xs="24" :md="12">
              <ADivider title-placement="left">ATimeline</ADivider>
              <ATimeline :items="timelineItems" />
            </ACol>
          </ARow>
        </div>

        <!-- 5. Feedback -->
        <div v-if="activeGroupTab === 'feedback'" class="space-y-6 pt-2">
          <ADivider title-placement="left">AAlert</ADivider>
          <ASpace direction="vertical" style="width: 100%">
            <AAlert type="info" title="Thông báo hệ thống" description="Đây là AAlert sử dụng prop title chuẩn của antdv-next." show-icon closable />
            <AAlert type="success" title="Lưu dữ liệu thành công" show-icon />
          </ASpace>

          <ADivider title-placement="left">AModal, ADrawer, message &amp; notification</ADivider>
          <ASpace wrap>
            <AButton type="primary" @click="modalOpen = true">Mở AModal</AButton>
            <AButton @click="drawerOpen = true">Mở ADrawer</AButton>
            <AButton @click="showMessage">message.success()</AButton>
            <AButton @click="showNotification">notification.info()</AButton>
          </ASpace>

          <ADivider title-placement="left">AProgress</ADivider>
          <div class="space-y-3">
            <AProgress :percent="progressPercent" />
            <ASpace>
              <AButton size="small" @click="progressPercent = Math.max(0, progressPercent - 10)">-10%</AButton>
              <AButton size="small" @click="progressPercent = Math.min(100, progressPercent + 10)">+10%</AButton>
            </ASpace>
          </div>

          <ADivider title-placement="left">ASpin &amp; ASkeleton</ADivider>
          <ARow :gutter="[16, 16]">
            <ACol :xs="24" :md="12">
              <ACard size="small" title="ASpin">
                <ASpin :spinning="spinning">
                  <div class="rounded bg-slate-100 p-4">Nội dung bên trong ASpin</div>
                </ASpin>
                <AButton class="mt-3" size="small" @click="spinning = !spinning">
                  {{ spinning ? "Tắt Spin" : "Bật Spin" }}
                </AButton>
              </ACard>
            </ACol>
            <ACol :xs="24" :md="12">
              <ACard size="small" title="ASkeleton">
                <ASkeleton active :loading="skeletonLoading" :paragraph="{ rows: 2 }">
                  <div>Nội dung đã tải xong!</div>
                </ASkeleton>
                <AButton class="mt-3" size="small" @click="skeletonLoading = !skeletonLoading">
                  {{ skeletonLoading ? "Hiện nội dung" : "Hiện Skeleton" }}
                </AButton>
              </ACard>
            </ACol>
          </ARow>
        </div>
      </ACard>
    </div>

    <AModal v-model:open="modalOpen" title="Xác nhận thao tác" @ok="modalOpen = false">
      <p>Đây là nội dung bên trong AModal với v-model:open.</p>
    </AModal>

    <ADrawer v-model:open="drawerOpen" title="Chi tiết cấu hình" placement="right">
      <p>Đây là nội dung bên trong ADrawer với v-model:open.</p>
    </ADrawer>
  </div>
</template>

<script setup lang="ts">
import { message, notification } from "antdv-next";
import type {
  CollapseItemType,
  DescriptionsItemType,
  FormInstance,
  MenuProps,
  Rule,
  StepItem,
  TableProps,
  TimelineItemType,
  UploadFile,
} from "antdv-next";

const activeGroupTab = ref("general");
const groupTabItems = [
  { key: "general", label: "General & Layout" },
  { key: "navigation", label: "Navigation" },
  { key: "form", label: "Data Entry (Form)" },
  { key: "display", label: "Data Display" },
  { key: "feedback", label: "Feedback" },
];

// 1. General & Layout
const btnLoading = ref(false);
const triggerBtnLoading = () => {
  btnLoading.value = true;
  setTimeout(() => {
    btnLoading.value = false;
  }, 1200);
};

// 2. Navigation
const menuSelectedKeys = ref<string[]>(["dashboard"]);
const menuItems: MenuProps["items"] = [
  { key: "dashboard", label: "Tổng quan" },
  { key: "students", label: "Học sinh" },
  {
    key: "settings",
    label: "Cài đặt",
    children: [
      { key: "general-setting", label: "Cấu hình chung" },
      { key: "roles", label: "Phân quyền" },
    ],
  },
];

const breadcrumbItems = [{ title: "Trang chủ" }, { title: "Hệ thống" }, { title: "Playground" }];

const subTabKey = ref("tab1");
const subTabItems = [
  { key: "tab1", label: "Tab 1", content: "Nội dung Tab 1" },
  { key: "tab2", label: "Tab 2", content: "Nội dung Tab 2" },
  { key: "tab3", label: "Tab 3", content: "Nội dung Tab 3" },
];

const currentStep = ref(1);
const stepItems: StepItem[] = [
  { title: "Khởi tạo", content: "Tạo hồ sơ" },
  { title: "Xét duyệt", content: "Kiểm tra thông tin" },
  { title: "Hoàn tất", content: "Kích hoạt tài khoản" },
];

const dropdownItems: MenuProps["items"] = [
  { key: "edit", label: "Chỉnh sửa" },
  { key: "export", label: "Xuất Excel" },
  { type: "divider" },
  { key: "delete", label: "Xoá", danger: true },
];
const handleDropdownClick: MenuProps["onClick"] = ({ key }) => {
  message.info(`Đã chọn mục: ${String(key)}`);
};

const currentPage = ref(1);
const pageSize = ref(10);

// 3. Data Entry (Form)
const formRef = ref<FormInstance>();
const formState = reactive<{
  fullName: string;
  age: number | null;
  subjects: string[];
  enrollDate: unknown;
  active: boolean;
  priority: number;
  gender: string;
  skills: string[];
  files: UploadFile[];
}>({
  fullName: "",
  age: 18,
  subjects: ["math"],
  enrollDate: null,
  active: true,
  priority: 60,
  gender: "male",
  skills: ["vue"],
  files: [],
});

const formRules: Record<string, Rule[]> = {
  fullName: [{ required: true, message: "Vui lòng nhập họ và tên", trigger: "blur" }],
  subjects: [{ required: true, type: "array", min: 1, message: "Chọn ít nhất 1 môn học", trigger: "change" }],
};

const subjectOptions = [
  { label: "Toán học", value: "math" },
  { label: "Vật lý", value: "physics" },
  { label: "Hóa học", value: "chemistry" },
  { label: "Tin học", value: "cs" },
];

const skillOptions = [
  { label: "Vue 3", value: "vue" },
  { label: "Nuxt 4", value: "nuxt" },
  { label: "TypeScript", value: "ts" },
];

const onFormFinish = () => {
  message.success("Biểu mẫu hợp lệ và đã gửi thành công!");
};
const resetForm = () => {
  formRef.value?.resetFields();
};

// 4. Data Display
interface StudentRow {
  id: number;
  name: string;
  age: number;
  className: string;
  status: "active" | "pending" | "inactive";
}

const tableColumns: TableProps<StudentRow>["columns"] = [
  { title: "Họ tên", dataIndex: "name", key: "name" },
  { title: "Tuổi", dataIndex: "age", key: "age", sorter: (a, b) => a.age - b.age },
  { title: "Lớp", dataIndex: "className", key: "className" },
  { title: "Trạng thái", dataIndex: "status", key: "status" },
];

const tableData: StudentRow[] = [
  { id: 1, name: "Nguyễn Văn An", age: 16, className: "10A1", status: "active" },
  { id: 2, name: "Trần Thị Bình", age: 17, className: "11A2", status: "pending" },
  { id: 3, name: "Lê Minh Châu", age: 15, className: "10A3", status: "active" },
  { id: 4, name: "Phạm Quốc Dũng", age: 18, className: "12A1", status: "inactive" },
];

const descriptionItems: DescriptionsItemType[] = [
  { key: "name", label: "Tên trường", content: "THPT Chuyên Antdv" },
  { key: "code", label: "Mã đơn vị", content: "SCH-2026" },
  { key: "year", label: "Năm học", content: "2026 - 2027" },
];

const collapseActiveKey = ref(["1"]);
const collapseItems: CollapseItemType[] = [
  { key: "1", label: "Mục 1: Thông tin chung", content: "Nội dung chi tiết của mục 1." },
  { key: "2", label: "Mục 2: Quy định", content: "Nội dung chi tiết của mục 2." },
];

const timelineItems: TimelineItemType[] = [
  { color: "green", title: "08:00", content: "Khởi tạo học kỳ mới" },
  { color: "blue", title: "09:30", content: "Phân lớp và thời khóa biểu" },
  { color: "gray", title: "14:00", content: "Công bố danh sách chính thức" },
];

// 5. Feedback
const modalOpen = ref(false);
const drawerOpen = ref(false);
const spinning = ref(false);
const skeletonLoading = ref(true);
const progressPercent = ref(70);

const showMessage = () => {
  message.success("Thao tác thành công với message.success()!");
};

const showNotification = () => {
  notification.info({
    title: "Thông báo mới",
    description: "Đây là notification.info() từ antdv-next.",
  });
};
</script>
