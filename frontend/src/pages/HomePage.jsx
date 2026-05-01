import { Link, useNavigate } from "react-router-dom";
import { useChatAssistant } from "../context/ChatAssistantContext";
import { ROUTES } from "../constants/routes";
import HeroCarousel from "../components/home/HeroCarousel";
import HomeRecentActivity from "../components/home/HomeRecentActivity";
import PopularCityExplore from "../components/home/PopularCityExplore";

const browseCategories = [
  { label: "Restaurants", q: "restaurants", icon: "🍽️" },
  { label: "Shopping", q: "shopping", icon: "🛍️" },
  { label: "Nightlife", q: "nightlife", icon: "🎵" },
  { label: "Active Life", q: "active life", icon: "🏃" },
  { label: "Beauty & Spas", q: "beauty", icon: "💅" },
  { label: "More", q: "services", icon: "✨" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const chat = useChatAssistant();

  const goExplore = (q, city) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (city?.trim()) params.set("city", city.trim());
    const s = params.toString();
    navigate(s ? `${ROUTES.EXPLORE}?${s}` : ROUTES.EXPLORE);
  };

  const handleHeroCta = (q) => {
    goExplore(q, "");
  };

  return (
    <div className="pb-0">
      <HeroCarousel onCta={handleHeroCta} />

      <HomeRecentActivity />

      <section className="py-14 sm:py-16 bg-surface-muted border-t border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 tracking-tight text-center">
            Browse by category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {browseCategories.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => goExplore(c.q, "")}
                className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 text-center shadow-card hover:shadow-card-hover hover:border-gray-300 transition-all duration-200"
              >
                <span className="text-2xl block mb-2" aria-hidden>
                  {c.icon}
                </span>
                <span className="text-sm font-bold text-gray-900">{c.label}</span>
              </button>
            ))}
          </div>
          <p className="text-center mt-8">
            <Link
              to={ROUTES.EXPLORE}
              className="text-sm font-bold text-yelp-red hover:underline"
            >
              See all restaurants across cities →
            </Link>
          </p>
        </div>
      </section>

      <PopularCityExplore />

      <section className="py-14 max-w-3xl mx-auto px-4 sm:px-6 rounded-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-10 text-center shadow-card">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Dining assistant</h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
            Ask for a dining idea that matches your vibe.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <button
              type="button"
              onClick={() => chat.open()}
              className="inline-flex justify-center px-7 py-3 rounded-lg text-white text-sm font-bold bg-yelp-red hover:bg-yelp-red-hover shadow-sm transition-colors"
            >
              Open dining assistant
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
