<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Message, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { UserStore } from '@/stores/modules/user'

const emit = defineEmits(['success', 'switch-tab'])
const userStore = UserStore()

const loading = ref(false)
const loginFormRef = ref<FormInstance>()

const loginForm = reactive({
  email: '',
  password: '',
})

// 表单验证规则
const loginRules = reactive<FormRules>({
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z\W]{8,18}$/,
      message: '密码格式：8-18位数字、字母、符号的任意两种组合',
      trigger: 'blur',
    },
  ],
})

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const result = await userStore.userLogin(loginForm)
        if (result.success) {
          ElMessage.success(result.message)
          emit('success')
        } else {
          ElMessage.error(result.message)
        }
      } catch (error: any) {
        ElMessage.error(error.message || '登录失败')
      } finally {
        loading.value = false
      }
    }
  })
}

function switchToRegister() {
  // 通知父组件切换到注册标签
  emit('switch-tab', 'register')
}

function switchToReset() {
  // 通知父组件切换到重置密码标签
  emit('switch-tab', 'reset')
}
</script>

<template>
  <div class="login-container">
    <p class="form-subtitle">输入您的邮箱以登录您的账户</p>

    <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-width="0" size="large"
      @keyup.enter="handleLogin">
      <el-form-item prop="email">
        <el-input v-model="loginForm.email" placeholder="邮箱" :prefix-icon="Message" autocomplete="off" />
      </el-form-item>

      <el-form-item prop="password" class="mt-6">
        <el-input v-model="loginForm.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password autocomplete="new-password"/>
      </el-form-item>

      <div class="forgot-password">
        <a href="#" @click.prevent="switchToReset">忘记密码？</a>
      </div>

      <el-form-item class="mt-6">
        <el-button class="submit-btn" type="primary" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form-item>
    </el-form>

    <p class="signup-text">
      没有账户？
      <a href="#" @click.prevent="switchToRegister">注册</a>
    </p>
  </div>
</template>

<style scoped>
.login-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.form-subtitle {
  color: #b3b3b3; /* Spotify 次级文本灰 */
  margin-bottom: 24px;
  font-size: 14px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

/* 🌟 核心修改：强制覆盖输入框背景为深灰，文字为白 */
/* 使用 !important 确保覆盖 Element Plus 的默认白色 */
.login-container :deep(.el-input__wrapper) {
  background-color: #282828 !important; /* Spotify 输入框深灰 */
  box-shadow: 0 0 0 1px #333333 inset !important; /* 灰色边框 */
  border-radius: 8px;
}

/* 🌟 输入框聚焦时的外发光效果，改成绿色！ */
.login-container :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #1DB954 inset !important; /* 聚焦时变成 Spotify 绿 */
}

/* 🌟 强制修改输入框内的文字颜色为白色 */
.login-container :deep(.el-input__inner) {
  color: #ffffff !important;
}

/* 修改输入框左侧图标颜色 */
.login-container :deep(.el-input__prefix-inner) {
  color: #b3b3b3;
}

/* Spotify 风格的大绿按钮 */
.submit-btn {
  width: 100%;
  border-radius: 500px;
  height: 44px;
  font-size: 16px;
  font-weight: bold;
  background-color: #1DB954;
  color: #000000;
  border: none;
  transition: transform 0.1s, background-color 0.2s;
}

.submit-btn:hover {
  background-color: #1ed760;
  transform: scale(1.02);
}

.signup-text {
  text-align: center;
  margin-top: 16px;
  color: #b3b3b3;
}

.signup-text a {
  color: #ffffff;
  font-weight: 600;
  text-decoration: none;
}

.signup-text a:hover {
  color: #1DB954;
  text-decoration: underline;
}

.forgot-password {
  text-align: right;
  margin: -10px 0 10px;
}

.forgot-password a {
  color: #b3b3b3;
  font-size: 14px;
  text-decoration: none;
}

.forgot-password a:hover {
  color: #1DB954;
  text-decoration: underline;
}
</style>