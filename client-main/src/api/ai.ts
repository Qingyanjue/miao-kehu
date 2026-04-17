import { httpGet, httpPost, http } from '@/utils/http'

// 1. 获取会话列表 (GET 请求，参数放在 URL 后面)
export const getAiSessions = (params: { userId: number }) => {
  return httpGet('/ai/creation/sessions', params)
}

// 2. 新建会话 (POST 请求，数据放在 Body 里)
export const createAiSession = (data: { userId: number, title: string }) => {
  return httpPost('/ai/creation/session', data)
}

// 3. 获取单个会话的聊天记录 (GET 请求)
export const getAiMessages = (params: { sessionId: number }) => {
  return httpGet('/ai/creation/messages', params)
}

// 4. 发送 AI 对话 (POST 请求)
// client-main/src/api/ai.ts

export const sendAiChat = (data: { 
  userId?: number,         // 可选
  sessionId?: number,      // 创作中心才传
  content?: string,        // 创作中心才传
  messages?: { role: string, content: string }[] // 公共区才传
}) => {
  return httpPost('/ai/creation/chat', data)
}

// 👇👇👇 🌟 新增：专门给公共区用的接口！指向 /ai/chat 👇👇👇
export const sendPublicAiChat = (data: { messages: any[] }) => {
  return httpPost('/ai/chat', data)
}

// 5. 删除会话 (DELETE 请求)
export const deleteAiSession = (sessionId: number) => {
  return http('delete', '/ai/creation/session', { params: { sessionId } })
}

// 1. 发起 AI 创作音乐请求
export const generateMusicApi = (prompt: string) => {
  return httpPost("/ai/creation/music/generate", { prompt });
};

// 2. 查询 AI 音乐的生成状态和链接
export const getMusicStatusApi = (ids: string) => {
  return httpGet("/ai/creation/music/status?ids=" + ids);
};

// 直接把消息存入数据库（不触发大模型聊天）
export const saveDirectMsgApi = (data: any) => {
  return httpPost("/ai/creation/message/save_direct", data); 
  // ⚠️ 注意：这里的 URL 请和你 Controller 里写的 @RequestMapping 路径保持一致！
};