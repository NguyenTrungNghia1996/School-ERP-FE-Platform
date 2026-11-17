<template>
  <div class="min-h-screen bg-slate-50 text-slate-800">
    <!-- Public Header -->
    <header class="border-b border-slate-200/80 bg-white">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-emerald-500 text-white shadow-xs">
            <AppstoreOutlined class="text-xl" />
          </div>
          <div>
            <div class="text-sm font-bold tracking-tight text-slate-800">SCHOOL ERP PLATFORM</div>
            <div class="text-[11px] text-slate-400">Nền tảng Quản trị &amp; Điều hành Trường học Số</div>
          </div>
        </div>

        <ASpace>
          <AButton v-if="isAuthenticated" type="primary" @click="navigateTo('/dashboard')">
            Vào Dashboard
          </AButton>
          <AButton v-else type="primary" @click="navigateTo('/login')">
            Đăng nhập hệ thống
          </AButton>
        </ASpace>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div class="mx-auto max-w-3xl text-center">
        <ATag color="blue" class="mb-4">Nền tảng SaaS Giáo dục Đa trường</ATag>
        <ATypographyTitle :level="1" class="!mb-4 !text-3xl sm:!text-4xl">
          Quản trị Hệ thống School ERP Tập trung &amp; Linh hoạt
        </ATypographyTitle>
        <ATypographyParagraph type="secondary" class="!mb-8 text-base">
          Giải pháp quản lý toàn diện tổ chức, phân quyền người dùng, gói dịch vụ và vận hành hệ thống trường học số trên một nền tảng duy nhất.
        </ATypographyParagraph>

        <ASpace size="middle" wrap>
          <AButton type="primary" size="large" @click="navigateTo(isAuthenticated ? '/dashboard' : '/login')">
            {{ isAuthenticated ? "Đi tới Dashboard" : "Đăng nhập ngay" }}
          </AButton>
        </ASpace>
      </div>

      <!-- Feature Highlights -->
      <ARow :gutter="[20, 20]" class="mt-14">
        <ACol :xs="24" :md="8">
          <ACard class="h-full !rounded-2xl !border-slate-200/80 shadow-xs">
            <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ApartmentOutlined class="text-xl" />
            </div>
            <ATypographyTitle :level="5">Quản lý Tổ chức &amp; Tenant</ATypographyTitle>
            <ATypographyText type="secondary" class="text-sm">
              Khởi tạo trường học, quản lý subdomain và phân bổ tài nguyên linh hoạt theo từng đơn vị.
            </ATypographyText>
          </ACard>
        </ACol>

        <ACol :xs="24" :md="8">
          <ACard class="h-full !rounded-2xl !border-slate-200/80 shadow-xs">
            <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <SafetyCertificateOutlined class="text-xl" />
            </div>
            <ATypographyTitle :level="5">Phân quyền &amp; Bảo mật RBAC</ATypographyTitle>
            <ATypographyText type="secondary" class="text-sm">
              Kiểm soát truy cập chi tiết theo vai trò, danh mục quyền và cây menu động từ máy chủ.
            </ATypographyText>
          </ACard>
        </ACol>

        <ACol :xs="24" :md="8">
          <ACard class="h-full !rounded-2xl !border-slate-200/80 shadow-xs">
            <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <CreditCardOutlined class="text-xl" />
            </div>
            <ATypographyTitle :level="5">Gói dịch vụ &amp; Vận hành</ATypographyTitle>
            <ATypographyText type="secondary" class="text-sm">
              Theo dõi gói cước, nhật ký kiểm toán (Audit Logs) và hỗ trợ kỹ thuật an toàn.
            </ATypographyText>
          </ACard>
        </ACol>
      </ARow>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

useHead({
  title: "Giới thiệu | School ERP Platform",
});

const { isAuthenticated } = useAuth();
</script>
