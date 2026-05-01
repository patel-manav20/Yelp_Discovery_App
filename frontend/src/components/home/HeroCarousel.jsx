import { useEffect, useState } from "react";

export const HERO_SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85",
    headline: "Big day? Dream spot.",
    cta: "Wedding venues",
    exploreQ: "wedding venues",
  },
  {
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2000&q=85",
    headline: "Tonight, something delicious.",
    cta: "Find restaurants",
    exploreQ: "restaurants",
  },
  {
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=2000&q=85",
    headline: "Stress-free moving",
    cta: "Movers & storage",
    exploreQ: "movers",
  },
  {
    image:
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=2000&q=85",
    headline: "Your next favorite coffee.",
    cta: "Coffee near me",
    exploreQ: "coffee",
  },
];

const INTERVAL_MS = 6500;

export default function HeroCarousel({ onCta, className = "" }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((i) => (i + 1) % HERO_SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[active];

  return (
    <section
      className={`relative min-h-[min(92vh,880px)] w-full overflow-hidden bg-gray-900 ${className}`}
      aria-roledescription="carousel"
      aria-label="Featured themes"
    >
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.image}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
            i === active ? "opacity-100 z-0" : "opacity-0 z-0 pointer-events-none"
          }`}
          aria-hidden={i !== active}
        >
          <img
            src={s.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-105"
            loading={i === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      <div
        className="absolute inset-0 z-[1] bg-gradient-to-r from-black/75 via-black/45 to-black/25"
        aria-hidden
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/55 via-transparent to-black/20" aria-hidden />

      <div className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-[2] flex flex-col items-center gap-3">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`group flex flex-col items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
            aria-label={`Slide ${i + 1} of ${HERO_SLIDES.length}`}
            aria-current={i === active}
          >
            <span
              className={`block rounded-full bg-white transition-all duration-500 ${
                i === active ? "w-1 h-10 opacity-100" : "w-0.5 h-5 opacity-40 group-hover:opacity-70"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="relative z-[2] flex flex-col justify-end min-h-[min(92vh,880px)] px-5 sm:px-10 lg:px-16 pb-14 sm:pb-20 pt-36 md:pt-44 max-w-4xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] font-extrabold text-white tracking-tight leading-[1.08] drop-shadow-lg max-w-xl">
          {slide.headline}
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onCta?.(slide.exploreQ)}
            className="inline-flex items-center gap-2 rounded-full bg-yelp-red hover:bg-yelp-red-hover text-white text-sm sm:text-base font-bold px-6 py-3.5 shadow-lg shadow-black/20 transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {slide.cta}
          </button>
        </div>
      </div>
    </section>
  );
}
