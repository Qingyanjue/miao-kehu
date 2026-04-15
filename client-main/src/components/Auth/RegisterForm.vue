<script setup lang="ts">
import { ref, reactive } from 'vue'
import { User, Message, Lock, Key } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { sendEmailCode, register } from '@/api/system'

const emit = defineEmits(['success', 'switch-tab'])

const loading = ref(false)
const countdown = ref(0)
const registerFormRef = ref<FormInstance>()

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  verificationCode: '',
})

// 表单验证规则
const registerRules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]{4,16}$/,
      message: '用户名格式：4-16位字符（字母、数字、下划线、连字符）',
      trigger: 'blur',
    },
  ],
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
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      pattern: /^[0-9a-zA-Z]{6}$/,
      message: '验证码格式：6位字符（大小写字母、数字）',
      trigger: 'blur',
    },
  ],
})

// 发送验证码
const handleSendCode = async () => {
  try {
    if (!registerForm.email) {
      ElMessage.warning('请先输入邮箱')
      return
    }
    const response = await sendEmailCode(registerForm.email)
    if (response.code === 0) {
      ElMessage.success('验证码已发送')
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      ElMessage.error(response.message)
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发送验证码失败')
  }
}

// 注册处理
const handleRegister = async () => {
  if (!registerFormRef.value) return
  await registerFormRef.value.validate(async (valid, fields) => {
    if (valid) {
      loading.value = true
      try {
        const response = await register(registerForm)
        if (response.code === 0) {
          ElMessage.success('注册成功，请登录')
          emit('switch-tab', 'login')
        } else {
          ElMessage.error(response.message)
        }
      } catch (error: any) {
        ElMessage.error(error.message || '注册失败')
      } finally {
        loading.value = false
      }
    } else {
      console.log('验证失败:', fields)
    }
  })
}

function switchToLogin() {
  // 通知父组件切换到登录标签
  emit('switch-tab', 'login')
}
</script>

<template>
  <div class="register-container">
    <p class="form-subtitle">创建一个新账户</p>

    <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="0" size="large"
      @keyup.enter="handleRegister">
      <el-form-item prop="username">
        <el-input v-model="registerForm.username" placeholder="用户名" :prefix-icon="User" />
      </el-form-item>

      <el-form-item prop="email" class="mt-6">
        <el-input v-model="registerForm.email" placeholder="邮箱" :prefix-icon="Message">
          <template #append>
            <el-button :disabled="!!countdown || loading" @click="handleSendCode">
              {{ countdown ? `${countdown}s后重试` : '获取验证码' }}
            </el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item prop="verificationCode" class="mt-6">
        <el-input v-model="registerForm.verificationCode" placeholder="验证码" :prefix-icon="Key" autocomplete="off" />
      </el-form-item>

      <el-form-item prop="password" class="mt-6">
        <el-input v-model="registerForm.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password autocomplete="new-password" />
      </el-form-item>

      <el-form-item class="mt-6">
        <el-button class="submit-btn" type="primary" :loading="loading" @click="handleRegister">
          注册
        </el-button>
      </el-form-item>
    </el-form>

    <p class="login-text">
      已有账户？
      <a href="#" @click.prevent="switchToLogin">登录</a>
    </p>
  </div>
</template>


<style scoped>
.register-container {
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

/* 🌟 输入框强制覆盖深灰背景 + 白字 */
:deep(.el-input__wrapper) {
  background-color: #282828 !important; 
  box-shadow: 0 0 0 1px #333333 inset !important; 
  border-radius: 8px;
}

/* 聚焦时亮起 Spotify 绿 */
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #1DB954 inset !important; 
}

:deep(.el-input__inner) {
  color: #ffffff !important;
}

:deep(.el-input__prefix-inner) {
  color: #b3b3b3;
}

/* 🌟 如果注册里有“发送验证码”这种普通按钮，也改成暗黑版 */
:deep(.el-button--default) {
  background-color: #282828 !important;
  border-color: #333333 !important;
  color: #b3b3b3 !important;
}
:deep(.el-button--default:hover) {
  color: #1DB954 !important;
  border-color: #1DB954 !important;
}

/* 注册/提交大按钮 */
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

/* 底部“已有账号？去登录”的文字 */
.login-text {
  text-align: center;
  margin-top: 16px;
  color: #b3b3b3;
}

.login-text a {
  color: #ffffff;
  font-weight: 600;
  text-decoration: none;
}

.login-text a:hover {
  color: #1DB954;
  text-decoration: underline;
}
</style>
