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
/* 保持标签导航居中 */
.auth-tabs :deep(.el-tabs__nav) {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 标签文字基础颜色：高级半透明灰 */
.auth-tabs :deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
  color: rgba(255, 255, 255, 0.5); 
  font-weight: 600;
  transition: color 0.3s;
}

/* 标签选中时亮起 Spotify 绿 */
.auth-tabs :deep(.el-tabs__item.is-active),
.auth-tabs :deep(.el-tabs__item:hover) {
  color: #1DB954; 
}

/* 🌟 核心特效：深色磨砂毛玻璃 (Dark Glassmorphism) */
:deep(.el-dialog) {
  /* 1. 半透明的深黑底色 (透明度0.65) */
  background: rgba(24, 24, 24, 0.65) !important; 
  /* 2. 核心魔法：高斯模糊背景 */
  backdrop-filter: blur(20px) !important; 
  -webkit-backdrop-filter: blur(20px) !important; /* 兼容 Safari */
  /* 3. 极细的半透明白边，模拟玻璃切割的高光边缘 */
  border: 1px solid rgba(255, 255, 255, 0.08) !important; 
  /* 4. 厚重的弥散阴影，让玻璃弹窗“浮”起来 */
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5) !important; 
  border-radius: 16px !important; 
}

/* 确保弹窗内部的主体部分也是透明的，不遮挡毛玻璃 */
:deep(.el-dialog__body),
:deep(.el-dialog__header) {
  background: transparent !important;
}

/* 弹窗标题（左上角）变白 */
:deep(.el-dialog__title) {
  color: #ffffff !important;
  font-weight: bold;
  letter-spacing: 1px;
}

/* 右上角关闭按钮 */
:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.3s;
}

:deep(.el-dialog__headerbtn:hover .el-dialog__close) {
  color: #ffffff;
  transform: scale(1.1); /* 鼠标悬浮微微放大 */
}

/* 隐藏 Element Plus 默认的底部横线，让毛玻璃更纯净 */
.auth-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}
</style>
