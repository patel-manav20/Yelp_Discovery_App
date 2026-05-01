import { api } from "./api";


export async function sendChatMessage(message, sessionId = null, conversationHistory = null) {
  const payload = {
    message,
    session_id: sessionId,
    conversation_history: conversationHistory,
  };
  const { data } = await api.post("/ai-assistant/chat", payload);
  return data;
}

export async function listChatSessions() {
  const { data } = await api.get("/ai-assistant/sessions");
  return data;
}

export async function getChatSession(sessionId) {
  const { data } = await api.get(`/ai-assistant/sessions/${sessionId}`);
  return data;
}

export async function deleteChatSession(sessionId) {
  await api.delete(`/ai-assistant/sessions/${sessionId}`);
}
