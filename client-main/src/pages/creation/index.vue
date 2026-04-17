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

    <div class="message-bubble">
      
      <div v-if="!msg.type || msg.type === 'text'" v-html="renderMarkdown(msg.content)"></div>

      <div v-else-if="msg.type === 'music'" class="music-card-content">
        
        <div v-if="msg.loading" class="music-loading-box">
          <el-tag type="warning" class="animate-pulse">🕒 AI 制作人正在编曲中 (约1分钟)...</el-tag>
          <el-skeleton :rows="2" animated style="margin-top: 10px;" />
        </div>

        <div v-else class="music-player-area">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <el-tag type="success" size="small">✅ 创作成功</el-tag>
            <span style="font-size: 11px; color: #888;">⚠️ 云端保留15天</span>
          </div>

          <div v-for="song in msg.audioUrls" :key="song.id" class="song-item-box" 
               style="background: rgba(0,0,0,0.1); padding: 12px; border-radius: 8px; margin-bottom: 8px;">
            <p style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">{{ song.title || '妙音 AI 乐章' }}</p>
            <audio :src="song.audio_url" controls style="width: 100%; height: 35px;"></audio>
            <div style="text-align: right; margin-top: 6px;">
              <el-link :href="song.audio_url" target="_blank" type="primary" :underline="false" style="font-size: 12px;">
                ⬇️ 下载 MP3
              </el-link>
            </div>
          </div>
        </div>

      </div> </div> </div> <div v-if="isLoading" class="message-wrapper assistant">
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
        <button 
          @click="handleGenerateMusic" 
          :disabled="isMusicLoading" 
          style="background-color: #e6a23c; margin-left: 10px;"
        >
          🎵 创作歌曲
        </button>
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
import { ref, onMounted, nextTick, computed, reactive} from 'vue'
import { ElMessage } from 'element-plus'
import { UserStore } from '@/stores/modules/user'
// 🌟 1. 引入我们刚刚写好的 5 个正规军接口
import { getAiSessions, createAiSession, getAiMessages, sendAiChat, deleteAiSession, generateMusicApi, getMusicStatusApi, saveDirectMsgApi } from '@/api/ai'

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

const switchSession = async (sessionId: number) => {
  currentSessionId.value = sessionId
  messages.value = [] 
  try {
    const res: any = await getAiMessages({ sessionId })
    if (res.code === 0 || res.code === 200) {
      
      messages.value = res.data.map((msg: any) => {
        
        // 🌟 核心解密：如果 content 里面有我们留下的暗号
        if (msg.content && msg.content.startsWith('@@MUSIC@@')) {
           try {
             // 1. 把暗号头切掉，剩下的就是纯 JSON 数据
             const jsonStr = msg.content.replace('@@MUSIC@@', '');
             // 2. 变回数组
             const urls = JSON.parse(jsonStr);
             
             return {
                ...msg,
                type: 'music', // 强制告诉页面渲染音乐卡片
                loading: false,
                audioUrls: urls,
                content: '[🎵 AI 专属音乐]' // 给一个兜底的文字
             };
           } catch(e) {
             console.error("解析音乐暗号失败", e);
           }
        }
        
        // 如果没有暗号，说明是普通的文字聊天，正常返回
        return {
           ...msg,
           type: 'text'
        };
      });

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

const isMusicLoading = ref(false); // 控制音乐按钮是否可以点击

// 🌟 完美适配版：函数名和你的按钮对上了！
const handleGenerateMusic = async () => {
  console.log("👉 1. 按钮被成功点击了！");

  try {
    // 🌟 变量名修正：使用你的 inputContent
    const text = inputContent.value ? inputContent.value.trim() : "";
    console.log("👉 2. 拿到的用户输入是：", text);

    if (!text) {
      ElMessage.warning("请在输入框写下你想要的歌曲感觉或主题哦！");
      return;
    }

    // A. 用户的消息上屏
    messages.value.push({ role: 'user', content: text } as any);
    // 🌟 A. 将用户的请求直接存入数据库
    try {
      await saveDirectMsgApi({
        sessionId: currentSessionId.value,
        userId: currentUserId.value,
        role: 'user',
        content: text,
        msgType: 'text' // 用户发的是纯文本
      });
    } catch (e) {
      console.error("保存用户输入失败", e);
    }
    inputContent.value = ''; // 清空你的输入框
    scrollToBottom(); // 让聊天滚到底部

    // B. AI 的加载气泡上屏
    const musicMsg = reactive({
      role: 'assistant',
      type: 'music',
      loading: true,
      audioUrls: []
    });
    messages.value.push(musicMsg as any);
    console.log("👉 3. 聊天气泡已经成功推入界面！");
    scrollToBottom();

    isMusicLoading.value = true; // 锁定按钮，防止连点

    // 开始呼叫后端
    console.log("🚀 4. 准备呼叫后端生成接口...");
    const res: any = await generateMusicApi(text);
    console.log("📥 5. 后端返回结果：", res);
    
    if (res.code === 200 || res.code === 0 || res.code === 1) { 
      const apiData = res.data; 
      let taskIds = "";
      const innerData = apiData?.data || apiData; 

      if (innerData) {
        if (Array.isArray(innerData)) {
          taskIds = innerData.map((t: any) => t.id || t.taskId).filter(Boolean).join(',');
        } else if (typeof innerData === 'object') {
          taskIds = innerData.taskId || innerData.task_id || innerData.id || "";
        }
      }

      if (taskIds) {
        console.log("🎯 6. 拿到任务 ID：", taskIds, "开始轮询！");
        startGenericPolling(taskIds, musicMsg); 
      } else {
        musicMsg.loading = false;
        isMusicLoading.value = false;
        ElMessage.error("发起失败：未获取到任务ID");
      }
    } else {
       musicMsg.loading = false;
       isMusicLoading.value = false;
       ElMessage.error("生成报错: " + (res.msg || "未知错误"));
    }
  } catch (error) {
    console.error("❌ 严重错误，代码执行崩溃：", error);
    isMusicLoading.value = false;
    ElMessage.error("前端执行出错，请看 F12 控制台！");
  }
};

// 通用版轮询函数（接收具体的聊天气泡 targetMsg 进行更新）
const startGenericPolling = (ids: string, targetMsg: any) => {
  const timer = setInterval(async () => {
    try {
      const res = await getMusicStatusApi(ids);
      
      if ((res.code === 200 || res.code === 1 || res.code === 0) && res.data && res.data.length > 0) {
        const sunoRes = res.data[0]; 
        
        if (sunoRes.code === 200 || sunoRes.code === 0 || sunoRes.code === 1) {
          const taskData = sunoRes.data; 
          
          if (taskData) {
            if (taskData.status === "SUCCESS") {
              clearInterval(timer); 
              
              const songs = taskData.response?.sunoData || [];
              if (Array.isArray(songs) && songs.length > 0) {
                // 1. 组装给页面显示用的数据
                  targetMsg.audioUrls = songs.map((song: any) => ({
                    id: song.id || Math.random().toString(),
                    title: song.title || '妙音 AI 乐章',
                    tags: song.tags || '流行',
                    audio_url: song.audioUrl || song.audio_url
                  })).filter((s: any) => s.audio_url); 
                  
                  targetMsg.loading = false;
                  isMusicLoading.value = false;
                  ElMessage.success("🎉 AI 创作完成！");

              // 🌟 B. 降维打击：把音乐数据转成特殊字符串，强行塞进 content 字段！
                try {
                  await saveDirectMsgApi({
                    sessionId: currentSessionId.value,
                    userId: currentUserId.value,
                    role: 'assistant',
                    // 🌟 核心魔法：用 @@MUSIC@@ 作为暗号头，后面跟着真实的音乐数据
                    content: '@@MUSIC@@' + JSON.stringify(targetMsg.audioUrls)
                    // msgType 和 mediaData 这两个字段直接删掉，我们不用它了！
                  });
                } catch (err) {
                  console.error("保存音乐记录到数据库失败", err);
                }
              }
            } 
            else if (taskData.status && (taskData.status.includes("FAIL") || taskData.status.includes("EXCEPTION"))) {
               clearInterval(timer);
               targetMsg.loading = false;
               isMusicLoading.value = false;
               ElMessage.error("中转站生成失败了");
            }
          }
        }
      }
    } catch (error) {
       console.log("轮询异常:", error);
    }
  }, 5000); 
};

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
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.5;
  font-size: 15px;
  word-wrap: break-word;
  /* 🌟 核心：删除了之前的 white-space: pre-wrap; */
  position: relative;
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

/* 🌟 双保险：强制抹除 Markdown 渲染后最后一个段落的任何多余间距 */
:deep(.message-bubble > div > p:last-child) {
  margin-bottom: 0 !important;
}

/* 3. 针对音乐卡片的专项加宽（解决进度条太短的问题） */
.music-card-content {
  /* 给音乐卡片一个稳固的宽度，保证进度条足够长 */
  min-width: 380px; 
  max-width: 500px;
  padding: 4px 0;
}

/* 让编曲中的提示有呼吸灯效果，显得很高级 */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 5. 调整音频播放器的样式，使其更美观 */
audio {
  width: 100%;
  height: 36px;
  filter: invert(0.1); /* 稍微调整颜色以适配深色背景 */
  border-radius: 8px;
}
</style>