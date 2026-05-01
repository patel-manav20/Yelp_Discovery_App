import { Link } from "react-router-dom";
import { restaurantYelpPath } from "../../constants/routes";
import RatingStars from "../reviews/RatingStars";
import { getRestaurantImageFallback } from "../../utils/restaurantImage";
import {
  resolveHoursStatus,
  resolveKeywords,
  resolveReviewSnippet,
} from "../../utils/yelpExploreRowCopy";

function priceDots(level) {
  if (!level || level < 1) return null;
  return "$".repeat(Math.min(4, level));
}

function cityShortLine(city, state) {
  if (!city) return "";
  const first = city.split(",")[0].trim();
  return first || city;
}

function directionsUrl(restaurant) {
  const { latitude, longitude, name, city, state, address_line } = restaurant;
  if (latitude != null && longitude != null) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  }
  const q = [name, address_line, city, state].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function PinIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={`shrink-0 text-gray-500 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function SpeechBubbleIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={`shrink-0 text-gray-400 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function HoursStatusText({ status }) {
  if (status.type === "closed") {
    return <span className="font-bold text-yelp-red">Closed</span>;
  }
  if (status.type === "open_now") {
    return <span className="font-bold text-green-700">Open now</span>;
  }
  if (status.type === "opens_in") {
    return (
      <span className="font-semibold text-amber-800">
        Opens in <span className="text-green-700">{status.minutes} min</span>
      </span>
    );
  }
  if (status.type === "open_until") {
    return (
      <>
        <span className="font-bold text-green-700">Open</span>
        <span className="text-gray-800"> until {status.until}</span>
      </>
    );
  }
  return null;
}

export default function YelpRestaurantRow({
  restaurant,
  isHighlighted = false,
  onHover,
  sponsored = false,
  listIndex = 0,
}) {
  const {
    id,
    name,
    description,
    city,
    state,
    average_rating,
    review_count,
    price_level,
    cuisine_tags,
    primary_photo_url,
    yelp_url: yelpUrl,
    source,
  } = restaurant;

  const imgSrc = primary_photo_url || getRestaurantImageFallback(name, cuisine_tags);
  const locShort = cityShortLine(city, state) || "Nearby";
  const price = priceDots(price_level) || "$$";
  const tags = resolveKeywords(cuisine_tags, id, listIndex);
  const mapsHref = directionsUrl(restaurant);
  const snippet = resolveReviewSnippet(description, id, listIndex, locShort);
  const hoursStatus = resolveHoursStatus(restaurant, listIndex);
  const isYelpLive = source === "yelp_live" && yelpUrl;
  const title = `${listIndex + 1}. ${name}`;

  return (
    <article
      className={`group flex gap-0 sm:gap-4 border-b border-[#ebebeb] bg-white transition-[background-color,box-shadow] duration-300 ease-out ${
        isHighlighted ? "bg-red-50/70 ring-1 ring-inset ring-yelp-red/20" : "hover:bg-[#fafafa]"
      }`}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative w-[132px] sm:w-[200px] shrink-0 self-stretch min-h-[132px] sm:min-h-[168px] bg-gray-100">
        <Link
          to={isYelpLive ? restaurantYelpPath(id) : `/restaurants/${id}`}
          className="absolute inset-0 z-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-yelp-red/50 focus-visible:ring-inset"
          aria-label={`View ${name}`}
        >
          <img
            src={imgSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        </Link>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="h-8 w-8 rounded-full bg-white/95 shadow flex items-center justify-center text-gray-700 text-sm border border-[#ebebeb]">
            ‹
          </span>
          <span className="h-8 w-8 rounded-full bg-white/95 shadow flex items-center justify-center text-gray-700 text-sm border border-[#ebebeb]">
            ›
          </span>
        </div>
        {sponsored ? (
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-white/95 text-gray-600 px-1.5 py-0.5 rounded border border-[#ebebeb]">
            Ad
          </span>
        ) : null}
      </div>

      <div className="flex-1 min-w-0 py-4 pr-4 pl-3 sm:pl-0 flex flex-col">
        <div className="min-w-0 flex-1">
          {isYelpLive ? (
            <Link
              to={restaurantYelpPath(id)}
              className="block text-lg font-bold text-gray-900 hover:underline decoration-yelp-red/40 underline-offset-2 leading-snug"
            >
              {title}
            </Link>
          ) : (
            <Link
              to={`/restaurants/${id}`}
              className="block text-lg font-bold text-gray-900 hover:underline decoration-yelp-red/40 underline-offset-2 leading-snug"
            >
              {title}
            </Link>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <RatingStars
              rating={average_rating}
              size="sm"
              showNumber
              reviewCount={review_count}
              compactReviewCount
            />
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-800">
            <span className="inline-flex items-center gap-1.5 flex-wrap">
              <PinIcon />
              <span>{locShort}</span>
              <span className="text-gray-400">•</span>
              <span className="font-medium text-gray-900">{price}</span>
              <span className="text-gray-400">•</span>
              <HoursStatusText status={hoursStatus} />
            </span>
          </p>

          <p className="mt-2.5 text-sm text-gray-600 leading-relaxed">
            <span className="inline-flex items-start gap-2">
              <SpeechBubbleIcon className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <span className="italic text-gray-700">
                  {"\u201c"}
                  {snippet.slice(0, 220)}
                  {snippet.length > 220 ? "…" : ""}
                  {"\u201d"}{" "}
                </span>
                {isYelpLive ? (
                  <Link
                    to={`${restaurantYelpPath(id)}#reviews`}
                    className="text-[#0073bb] font-semibold not-italic hover:underline"
                  >
                    See reviews
                  </Link>
                ) : (
                  <Link
                    to={`/restaurants/${id}#reviews`}
                    className="text-[#0073bb] font-semibold not-italic hover:underline"
                  >
                    See reviews
                  </Link>
                )}
              </span>
            </span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={`${id}-${t}`}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="mt-3">
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0073bb] hover:underline"
            >
              Get directions
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden
              >
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </p>
        </div>
      </div>
    </article>
  );
}
