import { useRef, useEffect } from "react";

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask anything about food, mood, or neighborhood…",
}) {
  const ta = useRef(null);

  useEffect(() => {
    if (!ta.current) return;
    ta.current.style.height = "auto";
    ta.current.style.height = `${Math.min(ta.current.scrollHeight, 120)}px`;
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit?.();
    }
  };

  return (
    <div className="flex gap-2 items-end border-t border-gray-100 bg-white p-3 sm:p-4">
      <textarea
        ref={ta}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red disabled:bg-gray-50 disabled:text-gray-400 min-h-[44px] max-h-[120px]"
      />
      <button
        type="button"
        onClick={() => value.trim() && onSubmit?.()}
        disabled={disabled || !value.trim()}
        className="shrink-0 h-11 px-5 rounded-xl text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
      >
        Send
      </button>
    </div>
  );
}
