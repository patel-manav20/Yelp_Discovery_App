import { createContext, useContext, useMemo, useRef } from "react";
import ChatWidget from "../components/chat/ChatWidget";

const ChatAssistantContext = createContext(null);

export function ChatAssistantProvider({ children }) {
  const widgetRef = useRef(null);
  const api = useMemo(
    () => ({
      open: () => widgetRef.current?.open?.(),
      sendText: (text) => widgetRef.current?.sendText?.(text),
    }),
    []
  );

  return (
    <ChatAssistantContext.Provider value={api}>
      {children}
      <ChatWidget ref={widgetRef} />
    </ChatAssistantContext.Provider>
  );
}

export function useChatAssistant() {
  const ctx = useContext(ChatAssistantContext);
  if (!ctx) {
    throw new Error("useChatAssistant must be used within ChatAssistantProvider");
  }
  return ctx;
}
