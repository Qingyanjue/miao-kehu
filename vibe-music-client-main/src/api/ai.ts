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
export const sendAiChat = (data: { userId: number, sessionId: number, content: string }) => {
  return httpPost('/ai/creation/chat', data)
}

// 5. 删除会话 (DELETE 请求)
export const deleteAiSession = (sessionId: number) => {
  return http('delete', '/ai/creation/session', { params: { sessionId } })
}