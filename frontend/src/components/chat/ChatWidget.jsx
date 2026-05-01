import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { sendChatMessage, listChatSessions, getChatSession } from "../../services/chatService";
import { getApiErrorMessage } from "../../utils/apiError";
import { ROUTES } from "../../constants/routes";

const SUGGESTIONS = [
  "Find dinner tonight",
  "Best rated near me",
  "Vegan options",
  "Romantic dinner",
];
const RESET_ON_LOGIN_KEY = "ai_chat_reset_on_login";

function mapServerMessage(m) {
  if (m.role === "system") return null;
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.created_at,
    recommendations: [],
  };
}

const ChatWidget = forwardRef(function ChatWidget(_props, ref) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef(null);
  const submitMessageRef = useRef(async () => {});
  const prevAuthRef = useRef(isAuthenticated);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, open, scrollToBottom]);

  const loadLatestSession = useCallback(async () => {
    if (!isAuthenticated) return;

    if (sessionStorage.getItem(RESET_ON_LOGIN_KEY) === "1") {
      sessionStorage.removeItem(RESET_ON_LOGIN_KEY);
      setSessionId(null);
      setMessages([]);
      setHistoryLoaded(true);
      return;
    }

    setHistoryLoading(true);
    setError("");
    try {
      const sessions = await listChatSessions();
      if (!sessions?.length) {
        setSessionId(null);
        setMessages([]);
        setHistoryLoaded(true);
        return;
      }
      const latestId = sessions[0].id;
      const detail = await getChatSession(latestId);
      setSessionId(detail.id);
      const mapped = (detail.messages || [])
        .map(mapServerMessage)
        .filter(Boolean);
      setMessages(mapped);
      setHistoryLoaded(true);
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load chat history"));
      setHistoryLoaded(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (open && isAuthenticated && !historyLoaded && !authLoading) {
      loadLatestSession();
    }
  }, [open, isAuthenticated, historyLoaded, authLoading, loadLatestSession]);

  useEffect(() => {
    if (location.hash === "#ai-chat") {
      setOpen(true);
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current;
    if (wasAuthenticated && !isAuthenticated) {
      sessionStorage.setItem(RESET_ON_LOGIN_KEY, "1");
    }

    if (!isAuthenticated) {
      setSessionId(null);
      setMessages([]);
      setHistoryLoaded(false);
      setError("");
    }

    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const submitMessage = useCallback(
    async (text) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || loading) return;
      if (!isAuthenticated) {
        navigate(ROUTES.LOGIN, {
          state: {
            from: { pathname: window.location.pathname, search: window.location.search },
          },
        });
        return;
      }

      setError("");
      setInput("");
      setLoading(true);

      const userMsg = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const conversationHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      setMessages((m) => [...m, userMsg]);

      try {
        const res = await sendChatMessage(trimmed, sessionId, conversationHistory);
        setSessionId(res.session_id);
        const assistantMsg = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          createdAt: new Date().toISOString(),
          recommendations: res.recommendations || [],
        };
        setMessages((m) => [...m, assistantMsg]);
      } catch (e) {
        setError(getApiErrorMessage(e, "Something went wrong — try again."));
        setMessages((m) => m.filter((x) => x.id !== userMsg.id));
        setInput(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, isAuthenticated, navigate, sessionId, messages]
  );

  useEffect(() => {
    submitMessageRef.current = submitMessage;
  }, [submitMessage]);

  useImperativeHandle(
    ref,
    () => ({
      open: () => setOpen(true),
      sendText: (text) => {
        setOpen(true);
        if (text?.trim()) {
          queueMicrotask(() => submitMessageRef.current?.(text.trim()));
        }
      },
    }),
    []
  );

  const handleNewChat = () => {
    setError("");
    setSessionId(null);
    setMessages([]);
    setHistoryLoaded(true);
    setInput("");
  };

  const handleOpen = () => setOpen(true);

  const handleClose = () => setOpen(false);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[50] bg-black/25 sm:hidden"
          aria-label="Close assistant"
          onClick={handleClose}
        />
      ) : null}

      <button
        type="button"
        onClick={() => (open ? handleClose() : handleOpen())}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-yelp-red text-white shadow-lg hover:bg-yelp-red-hover hover:scale-105 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
        aria-expanded={open}
        aria-label={open ? "Close assistant" : "Open dining assistant"}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[55] sm:inset-auto sm:bottom-24 sm:right-5 sm:left-auto sm:top-auto flex flex-col sm:h-[min(560px,calc(100vh-7rem))] sm:w-[min(100vw-2.5rem,560px)] sm:rounded-2xl sm:shadow-2xl border-0 sm:border border-gray-200 bg-white overflow-hidden"
          role="dialog"
          aria-label="Dining assistant"
        >
          <header className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
            <div>
              <h2 className="text-base font-bold text-gray-900">Dining assistant</h2>
              <p className="text-xs text-gray-500">Ideas tailored to you</p>
            </div>
            <div className="flex items-center gap-1">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="text-xs font-medium text-yelp-red hover:underline px-2 py-1"
                >
                  New chat
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 sm:hidden"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 space-y-4 bg-gray-50/80"
          >
            {!isAuthenticated ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
                <p className="text-sm text-gray-700">Log in to get personalized picks.</p>
                <Link
                  to={ROUTES.LOGIN}
                  state={{
                    from: {
                      pathname: window.location.pathname,
                      search: window.location.search,
                    },
                  }}
                  className="inline-flex mt-4 px-5 py-2 rounded-lg bg-yelp-red text-white text-sm font-semibold hover:bg-yelp-red-hover"
                >
                  Log in
                </Link>
              </div>
            ) : historyLoading ? (
              <p className="text-center text-sm text-gray-500 py-8">Loading your conversation…</p>
            ) : messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center px-2">
                  Hi! Tell me what you&apos;re craving, or tap a quick idea below.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={loading}
                      onClick={() => submitMessage(s)}
                      className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-white border border-gray-200 text-gray-800 hover:border-yelp-red/50 hover:bg-red-50/50 transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {loading ? (
              <div className="flex items-start gap-2">
                <div className="rounded-2xl rounded-bl-md bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-yelp-red/60 animate-bounce [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 rounded-full bg-yelp-red/60 animate-bounce [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 rounded-full bg-yelp-red/60 animate-bounce" />
                    </span>
                    Thinking up suggestions…
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
          </div>

          {isAuthenticated ? (
            <>
              {messages.length > 0 ? (
                <div className="shrink-0 px-3 pt-2 pb-1 flex flex-wrap gap-2 border-t border-gray-100 bg-white">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={loading}
                      onClick={() => submitMessage(s)}
                      className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-yelp-red disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={() => submitMessage()}
                disabled={loading}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
});

export default ChatWidget;
