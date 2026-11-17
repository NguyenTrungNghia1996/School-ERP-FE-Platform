<template>
  <AForm
    ref="formRef"
    :model="formState"
    :rules="formRules"
    layout="vertical"
    @finish="handleSubmit"
  >
    <AFormItem label="Mật khẩu hiện tại" name="current_password">
      <AInputPassword
        v-model:value="formState.current_password"
        size="large"
        placeholder="Nhập mật khẩu hiện tại"
        autocomplete="current-password"
      >
        <template #prefix>
          <Icon name="ant-design:lock-outlined" class="text-slate-400" />
        </template>
      </AInputPassword>
    </AFormItem>

    <AFormItem label="Mật khẩu mới" name="new_password">
      <AInputPassword
        v-model:value="formState.new_password"
        size="large"
        placeholder="Tối thiểu 8 ký tự"
        autocomplete="new-password"
      >
        <template #prefix>
          <Icon name="ant-design:key-outlined" class="text-slate-400" />
        </template>
      </AInputPassword>
    </AFormItem>

    <AFormItem label="Xác nhận mật khẩu mới" name="confirm_password">
      <AInputPassword
        v-model:value="formState.confirm_password"
        size="large"
        placeholder="Nhập lại mật khẩu mới"
        autocomplete="new-password"
      >
        <template #prefix>
          <Icon name="ant-design:safety-certificate-outlined" class="text-slate-400" />
        </template>
      </AInputPassword>
    </AFormItem>

    <AFormItem class="!mb-0">
      <AButton
        type="primary"
        html-type="submit"
        size="large"
        :block="blockSubmit"
        :loading="submitting"
      >
        <template #icon>
          <Icon name="ant-design:check-circle-outlined" />
        </template>
        {{ submitText }}
      </AButton>
    </AFormItem>
  </AForm>
</template>

<script setup lang="ts">
import { message } from "antdv-next";
import type { FormInstance, Rule } from "antdv-next";
import type { ChangePasswordInput } from "~/types/api/auth";

const props = withDefaults(
  defineProps<{
    submitText?: string;
    blockSubmit?: boolean;
  }>(),
  {
    submitText: "Cập nhật mật khẩu",
    blockSubmit: false,
  },
);

const emit = defineEmits<{
  success: [];
}>();

const { platformMeChangePassword } = useApi();
const { handleApiError } = useApiError();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const formState = reactive({
  current_password: "",
  new_password: "",
  confirm_password: "",
});

const validateNewPassword = (_rule: Rule, value: string) => {
  if (value && value === formState.current_password) {
    return Promise.reject("Mật khẩu mới không được trùng mật khẩu hiện tại");
  }
  return Promise.resolve();
};

const validateConfirmPassword = (_rule: Rule, value: string) => {
  if (value && value !== formState.new_password) {
    return Promise.reject("Mật khẩu xác nhận không khớp");
  }
  return Promise.resolve();
};

const formRules: Record<string, Rule[]> = {
  current_password: [{ required: true, message: "Vui lòng nhập mật khẩu hiện tại", trigger: "blur" }],
  new_password: [
    { required: true, message: "Vui lòng nhập mật khẩu mới", trigger: "blur" },
    { min: 8, message: "Mật khẩu mới phải có ít nhất 8 ký tự", trigger: "blur" },
    { validator: validateNewPassword, trigger: "blur" },
  ],
  confirm_password: [
    { required: true, message: "Vui lòng xác nhận mật khẩu mới", trigger: "blur" },
    { validator: validateConfirmPassword, trigger: "blur" },
  ],
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload: ChangePasswordInput = {
      current_password: formState.current_password,
      old_password: formState.current_password,
      new_password: formState.new_password,
    };

    const { data, error } = await platformMeChangePassword.post(payload);
    if (handleApiError(data, error, "Đổi mật khẩu thất bại!")) {
      return;
    }

    message.success((unref(data) as { message?: string } | null)?.message || "Đổi mật khẩu thành công!");
    formRef.value?.resetFields();
    emit("success");
  } finally {
    submitting.value = false;
  }
};
</script>
