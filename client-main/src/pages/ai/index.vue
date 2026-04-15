<template>
  <div class="ai-container">
    <div class="chat-window" ref="chatWindow">
      <div v-for="(msg, index) in messages" :key="index" :class="['message-wrapper', msg.role]">
        <div class="avatar">
          <img v-if="msg.role === 'ai'" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" alt="AI">
          <img v-else src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" alt="User">
        </div>
       <div class="message-bubble" v-html="renderMarkdown(msg.content)"></div>
      </div>
      
      <div v-if="isLoading" class="message-wrapper ai">
        <div class="avatar"><img src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" alt="AI"></div>
        <div class="message-bubble typing">小妙正在疯狂翻阅乐理书思考中...</div>
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="inputMessage"
        @keyup.enter="sendMessage"
        type="text"
        placeholder="问点关于音乐的问题吧，比如：古典乐里的奏鸣曲式是什么结构？(按回车发送)"
        :disabled="isLoading"
      />
      <button @click="sendMessage" :disabled="isLoading || !inputMessage.trim()">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { sendPublicAiChat } from '@/api/ai' // 🌟 必须引入 API
import { UserStore } from '@/stores/modules/user' // 🌟 引入 userStore 来判断是否登录

import { marked } from 'marked'
// 告诉 marked 插件，遇到回车就直接换行
marked.setOptions({
  breaks: true
})
const renderMarkdown = (text: string) => {
  if (!text) return ''
  
  try {
    // 兼容 marked 的各种版本和导出方式
    if (marked && marked.parse) {
      return marked.parse(text) // 新版 marked 用法
    } else if (typeof marked === 'function') {
      // @ts-ignore
      return marked(text) // 老版 marked 用法
    }
    return text 
  } catch (error) {
    console.error("Markdown 解析出错了:", error)
    return text // 如果解析失败，原样返回，保证绝对不会白屏！
  }
}

const userStore = UserStore()

// 聊天记录数组
const messages = ref([
  { role: 'ai', content: '你好！我是妙音专属 AI 助手小妙 🎵。关于流行音乐史、乐理知识还是歌手信息，都可以随时问我哦！' }
])
const inputMessage = ref('')
const isLoading = ref(false)
const chatWindow = ref<HTMLElement | null>(null)

// 自动滚动到页面底部的魔法
const scrollToBottom = async () => {
  await nextTick()
  if (chatWindow.value) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight
  }
}

// 发送消息的核心方法
const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text || isLoading.value) return

  // 1. 把用户的话贴到屏幕上
  messages.value.push({ role: 'user', content: text })
  inputMessage.value = ''
  isLoading.value = true
  scrollToBottom()

  // 2. 滑动窗口：只取最近 10 条
  const validMessages = messages.value.filter(msg => msg.role === 'user' || msg.role === 'ai')
  const historyToSend = validMessages.slice(-10) 

  try {
    // 3. 拨打后端的 API 电话
    const res = await sendPublicAiChat({
      messages: historyToSend  
    })

    // 4. 把大模型的回答贴到屏幕上
    if (res.code === 0 || res.code === 200) { 
      // 兼容后端直接返回 String 或者是 { output: { choices: [...] } } 的情况
      const finalAnswer = res.data || res.message;
      messages.value.push({ role: 'ai', content: finalAnswer })
    } else {
      messages.value.push({ role: 'ai', content: '哎呀，系统开小差了：' + res.message })
    }
  } catch (error) {
    messages.value.push({ role: 'ai', content: '网络连接失败，请检查后端服务是不是忘开了哦~' })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.ai-container {
  display: flex;
  flex-direction: column;
  height: 85vh; /* 自动减去顶部导航和底部播放器的高度 */
  width: 100%; /* 🌟 核心拆墙：撑满整个右侧区域！消除左侧大黑边 */
  background-color: transparent; /* 背景变透明，完美融入妙音原有的暗黑主题 */
  padding: 20px 40px;
  box-sizing: border-box;
}
.chat-window {
  flex: 1;
  overflow-y: auto;
  width: 100%;
  max-width: 1200px; /* 限制一下聊天气泡的最宽距离，不然全屏太宽了眼睛看得累 */
  margin: 0 auto; /* 让聊天内容在宽屏幕里依然保持优雅居中 */
  padding-right: 10px;
  margin-bottom: 20px;
}

/* 美化滚动条 */
.chat-window::-webkit-scrollbar {
  width: 6px;
}
.chat-window::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.message-wrapper {
  display: flex;
  margin-bottom: 25px;
  align-items: flex-start;
}

.message-wrapper.user {
  flex-direction: row-reverse;
}

.avatar img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  margin: 0 15px;
  background-color: #333;
}

.message-bubble {
  max-width: 75%;
  padding: 14px 20px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 15px;
  word-wrap: break-word;
  white-space: pre-wrap; /* 关键：保留大模型输出的回车换行符！ */
}

/* AI 的气泡样式 */
.ai .message-bubble {
  background-color: #2b2b31;
  border-top-left-radius: 2px;
}

/* 用户的气泡样式 */
.user .message-bubble {
  background-color: #1db954; /* 经典绿，增加科技感 */
  color: white;
  border-top-right-radius: 2px;
}

.typing {
  font-style: italic;
  color: #1db954;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.input-area {
  display: flex;
  gap: 15px;
  width: 100%;
  max-width: 1200px; /* 输入框也和上面的气泡保持对齐 */
  margin: 0 auto; /* 居中对齐 */
}

.input-area input {
  flex: 1;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #333;
  background-color: #2b2b31;
  color: white;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;
}

.input-area input:focus {
  border-color: #1db954;
}

.input-area button {
  padding: 0 35px;
  border-radius: 8px;
  border: none;
  background-color: #1db954;
  color: white;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.input-area button:hover:not(:disabled) {
  background-color: #1ed760;
}

.input-area button:disabled {
  background-color: #444;
  color: #888;
  cursor: not-allowed;
}

/* 🌟 专门给 Markdown 排版写的样式 */
:deep(.message-bubble p) {
  margin: 0 ; /* 段落之间留点空隙 */
}
:deep(.message-bubble p:last-child) {
  margin-bottom: 0;
}
:deep(.message-bubble strong) {
  font-weight: 600;
  color: #1DB954; /* 把加粗的字体变成骚气的 Spotify 绿！极其酷炫！ */
}
:deep(.message-bubble ul), :deep(.message-bubble ol) {
  padding-left: 20px;
  margin: 0;
}
:deep(.message-bubble li) {
  margin-bottom: 0px;
}
</style>