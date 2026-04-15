
<template>
  <div class="creation-container">
    <!-- 左侧：历史创作列表 -->
    <div class="sidebar">
      <button class="new-chat-btn" @click="createNewSession">
        + 新建创作灵感
      </button>
      <div class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          :class="['session-item', { active: currentSessionId === session.id }]"
          @click="switchSession(session.id)"
        >
          <!-- 1. 用一个 span 把原来的标题包起来 -->
          <span class="session-title">📝 {{ session.title }}</span>
          
          <!-- 2. 🌟 新增的删除小按钮，加个垃圾桶 emoji 更直观 -->
          <span class="delete-btn" @click.stop="deleteSession(session.id)">
            🗑️
          </span>
        </div>
      </div>
    </div>

    <!-- 右侧：工作区（已选中会话） -->
    <div class="chat-area" v-if="currentSessionId">
      <div class="chat-window" ref="chatWindow">
        <div v-for="(msg, index) in messages" :key="index" :class="['message-wrapper', msg.role]">
          <div class="avatar">
            <img v-if="msg.role === 'assistant'" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" alt="AI">
            <img v-else src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" alt="User">
          </div>
          <div class="message-bubble" v-html="renderMarkdown(msg.content)"></div>
        </div>
        
        <div v-if="isLoading" class="message-wrapper assistant">
          <div class="avatar"><img src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" alt="AI"></div>
          <div class="message-bubble typing">AI 制作人正在疯狂寻找灵感中...</div>
        </div>
      </div>

      <div class="input-area">
        <input
          v-model="inputContent"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="输入你的创作灵感，例如：帮我写一首关于冬日重逢的流行情歌..."
          :disabled="isLoading"
        />
        <button @click="sendMessage" :disabled="isLoading || !inputContent.trim()">发送</button>
      </div>
    </div>

    <!-- 右侧：空状态（未选中会话） -->
    <div class="empty-state" v-else>
      <h2>🎵 欢迎来到你的专属创作中心</h2>
      <p>点击左侧“+ 新建创作灵感”开启你的音乐制作之旅吧！</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UserStore } from '@/stores/modules/user'
// 🌟 1. 引入我们刚刚写好的 5 个正规军接口
import { getAiSessions, createAiSession, getAiMessages, sendAiChat, deleteAiSession } from '@/api/ai'

import { marked } from 'marked'

// 🌟 新增：写一个专门的“安全解析函数”给 HTML 模板使用
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
const currentUserId = computed(() => userStore.userInfo?.userId)

const sessions = ref<any[]>([])
const currentSessionId = ref<number | null>(null)
const messages = ref<any[]>([])
const inputContent = ref('')
const isLoading = ref(false)
const chatWindow = ref<HTMLElement | null>(null)

const scrollToBottom = async () => {
  await nextTick()
  if (chatWindow.value) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight
  }
}

// 🌟 4. 获取左侧列表
const fetchSessions = async () => {
  if (!currentUserId.value) return 
  try {
    // 极其清爽的调用方式，不用写 URL，不用拼 Token
    const res: any = await getAiSessions({ userId: currentUserId.value })
    if (res.code === 0 || res.code === 200) {
      sessions.value = res.data
    }
  } catch (error) {
    console.error("获取会话失败", error)
  }
}

// 🌟 5. 新建一个灵感会话
const createNewSession = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning("请先登录妙音账号哦~")
    return
  }
  try {
    const res: any = await createAiSession({ userId: currentUserId.value, title: '新的创作灵感' })
    if (res.code === 0 || res.code === 200) {
      await fetchSessions()
      switchSession(res.data.id)
    }
  } catch (error) {
    console.error("创建会话失败", error)
  }
}

// 🌟 6. 切换会话
const switchSession = async (sessionId: number) => {
  currentSessionId.value = sessionId
  messages.value = [] 
  try {
    const res: any = await getAiMessages({ sessionId })
    if (res.code === 0 || res.code === 200) {
      messages.value = res.data
      scrollToBottom()
    }
  } catch (error) {
    console.error("获取记录失败", error)
  }
}

// 🌟 7. 发送创作请求
const sendMessage = async () => {
  const text = inputContent.value.trim()
  if (!text || isLoading.value || !currentSessionId.value) return

  messages.value.push({ role: 'user', content: text })
  inputContent.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    const res: any = await sendAiChat({
      userId: currentUserId.value,
      sessionId: currentSessionId.value,
      content: text
    })
    
    if (res.code === 0 || res.code === 200) {
      const finalAnswer = res.data || res.message
      messages.value.push({ role: 'assistant', content: finalAnswer })
    } else {
      messages.value.push({ role: 'assistant', content: '创作遇阻：' + res.message })
    }
  } catch (error) {
    // 具体的网络报错其实底层的 request.ts 已经弹窗过了，这里只需要给个托底
    messages.value.push({ role: 'assistant', content: '网络开小差了，请稍后再试。' })
  } finally {
    isLoading.value = false
    scrollToBottom()
    fetchSessions()
  }
}

// 🌟 删除会话
const deleteSession = async (sessionId: number) => {
  try {
    const res: any = await deleteAiSession(sessionId)
    if (res.code === 0 || res.code === 200) {
      ElMessage.success('已删除该灵感')
      
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        messages.value = []
      }
      fetchSessions()
    }
  } catch (error) {
    console.error("删除失败", error)
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchSessions()
  }
})
</script>

<style scoped>
.creation-container {
  display: flex;
  height: calc(100vh - 120px);
  max-width: 1200px; /* 🌟 限制最大宽度，防止在大屏幕上太散 */
  margin: 0 auto;    /* 🌟 居中魔法 */
  width: 100%;
  background-color: transparent;
  color: #fff;
  padding: 20px;
  box-sizing: border-box;
  gap: 20px;
}

/* 左侧列表样式 */
.sidebar {
  width: 260px;
  background-color: #121212; /* 加深底色 */
  border: 1px solid #333;    /* 🌟 增加低调的边框，体现立体感 */
  border-radius: 12px;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.new-chat-btn {
  width: 100%;
  padding: 12px;
  background-color: #1db954;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 15px;
  transition: background 0.3s;
}

.new-chat-btn:hover {
  background-color: #1ed760;
}

.session-list {
  flex: 1;
  overflow-y: auto;
}

.session-list::-webkit-scrollbar { width: 4px; }
.session-list::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

.session-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: #b3b3b3;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item:hover { background-color: #282828; color: #fff; }
.session-item.active { background-color: #333; color: #1db954; font-weight: bold; }

/* 右侧工作区样式 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1f;
  border-radius: 12px;
  padding: 20px;
}

/* 右侧空状态样式 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #121212; /* 同理，加深底色 */
  border: 1px solid #333;    /* 🌟 增加边框 */
  border-radius: 12px;
  color: #888;
}

.empty-state h2 { color: #fff; margin-bottom: 10px; }

.chat-window {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
  margin-bottom: 20px;
}

.chat-window::-webkit-scrollbar { width: 6px; }
.chat-window::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

.message-wrapper { display: flex; margin-bottom: 25px; align-items: flex-start; }
.message-wrapper.user { flex-direction: row-reverse; }

.avatar img {
  width: 42px; height: 42px; border-radius: 50%; margin: 0 15px; background-color: #333;
}

.message-bubble {
  max-width: 75%; padding: 14px 20px; border-radius: 12px;
  line-height: 1.6; font-size: 15px; word-wrap: break-word; white-space: pre-wrap;
}

.assistant .message-bubble { background-color: #2b2b31; border-top-left-radius: 2px; }
.user .message-bubble { background-color: #1db954; color: white; border-top-right-radius: 2px; }

.typing { font-style: italic; color: #1db954; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

.input-area { display: flex; gap: 15px; }
.input-area input {
  flex: 1; padding: 16px; border-radius: 8px; border: 1px solid #333;
  background-color: #2b2b31; color: white; font-size: 16px; outline: none;
}
.input-area input:focus { border-color: #1db954; }
.input-area button {
  padding: 0 35px; border-radius: 8px; border: none; background-color: #1db954;
  color: white; font-size: 16px; font-weight: bold; cursor: pointer;
}
.input-area button:hover:not(:disabled) { background-color: #1ed760; }
.input-area button:disabled { background-color: #444; color: #888; cursor: not-allowed; }

.session-item {
  display: flex;
  justify-content: space-between; /* 让标题和垃圾桶左右两端对齐 */
  align-items: center;
}

.delete-btn {
  font-size: 14px;
  cursor: pointer;
  opacity: 0; /* 默认隐藏 */
  transition: opacity 0.2s;
}

/* 鼠标悬浮在这一栏时，显示垃圾桶 */
.session-item:hover .delete-btn {
  opacity: 1; 
}

.delete-btn:hover {
  transform: scale(1.2); /* 鼠标指着垃圾桶时稍微放大一点点 */
}

/* 🌟 专门给 Markdown 排版写的样式 */
:deep(.message-bubble p) {
  margin: 0 0 2px 0; /* 段落之间留点空隙 */
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
  margin: 8px 0;
}
:deep(.message-bubble li) {
  margin-bottom: 4px;
}
</style>