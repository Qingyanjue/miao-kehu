<script setup lang="ts">
import { ref, computed } from 'vue'
import LoginForm from './LoginForm.vue'
import RegisterForm from './RegisterForm.vue'
import ResetPasswordForm from './ResetPasswordForm.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const activeTab = ref('login')

const tabTitles = {
  login: '登录',
  register: '注册',
  reset: '重置密码',
}

const handleSuccess = () => {
  dialogVisible.value = false
}

const handleClose = () => {
  activeTab.value = 'login'
}

const handleSwitchTab = (tab: string) => {
  activeTab.value = tab
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="tabTitles[activeTab]"
    width="500px"
    destroy-on-close
    @close="handleClose"
  >
    <div>
      <el-tabs v-model="activeTab" class="auth-tabs">
        <el-tab-pane name="login" :label="tabTitles.login">
          <LoginForm 
            @success="handleSuccess" 
            @switch-tab="handleSwitchTab"
          />
        </el-tab-pane>
        <el-tab-pane name="register" :label="tabTitles.register">
          <RegisterForm 
            @success="handleSuccess" 
            @switch-tab="handleSwitchTab"
          />
        </el-tab-pane>
        <el-tab-pane name="reset" :label="tabTitles.reset">
          <ResetPasswordForm 
            @success="handleSuccess" 
            @switch-tab="handleSwitchTab"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<style scoped>
/* 保持原有居中 */
.auth-tabs :deep(.el-tabs__nav) {
  width: 100%;
  display: flex;
  justify-content: center;
}

.auth-tabs :deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
  color: #b3b3b3; /* Spotify 次级文本灰 */
  font-weight: 600;
}

.auth-tabs :deep(.el-tabs__item.is-active) {
  color: #1DB954; /* 🌟 灵魂变色：Spotify 绿 */
}

/* 弹窗整体背景和标题 */
:deep(.el-dialog) {
  background-color: #181818; /* Spotify 卡片经典底色 */
  border-radius: 12px;
  border: 1px solid #282828; 
}

:deep(.el-dialog__title) {
  color: #ffffff;
  font-weight: bold;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #b3b3b3;
}

:deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #ffffff;
}
</style>
