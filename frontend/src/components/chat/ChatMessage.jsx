import RecommendationCard from "./RecommendationCard";

export default function ChatMessage({ message }) {
  const { role, content, recommendations = [], createdAt } = message;
  const isUser = role === "user";

  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isUser
            ? "bg-yelp-red text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200/80"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        {createdAt ? (
          <time
            className={`mt-1 block text-[10px] ${isUser ? "text-red-100" : "text-gray-400"}`}
            dateTime={createdAt}
          >
            {new Date(createdAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        ) : null}
      </div>

      {!isUser && recommendations?.length > 0 ? (
        <div className="w-full max-w-full sm:max-w-[95%] space-y-2 pl-0 sm:pl-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Picks for you
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recommendations.map((item, i) => (
              <RecommendationCard
                key={item.id ?? `${item.name}-${i}`}
                item={item}
                reason={
                  item.reason ||
                  (i === 0 ? "Strong match for what you asked" : "Also worth a look")
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
