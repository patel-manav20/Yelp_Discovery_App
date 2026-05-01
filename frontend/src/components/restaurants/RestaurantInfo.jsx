
function formatAddress({ address_line, city, state, postal_code, country }) {
  const line2 = [city, state, postal_code].filter(Boolean).join(", ");
  const parts = [address_line, line2, country].filter(Boolean);
  return parts.join("\n");
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatTime(s) {
  if (!s || typeof s !== "string") return "";
  const h = parseInt(s.slice(0, 2), 10);
  const m = s.slice(2);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}${m === "00" ? "" : `:${m}`} ${ampm}`;
}

export default function RestaurantInfo({
  address_line,
  city,
  state,
  postal_code,
  country,
  latitude,
  longitude,
  phone,
  website_url,
  hours,
  transactions,
  className = "",
}) {
  const addressText = formatAddress({
    address_line,
    city,
    state,
    postal_code,
    country,
  });
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const addressQuery = [address_line, city, state, postal_code, country]
    .filter(Boolean)
    .join(", ");
  const hasAddressQuery = addressQuery.trim().length > 0;
  const hasMap = hasCoords || hasAddressQuery;
  const mapsHref = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : hasAddressQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
      : null;

  const mapEmbedQuery = hasCoords ? `${lat},${lng}` : addressQuery;
  const mapEmbedSrc =
    hasMap && mapEmbedQuery.trim()
      ? `https://www.google.com/maps?q=${encodeURIComponent(mapEmbedQuery.trim())}&output=embed`
      : null;

  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card ${className}`}
    >
      <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
        Location &amp; contact
      </h2>
      <dl className="space-y-4 text-sm">
        {addressText ? (
          <div>
            <dt className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Address</dt>
            <dd className="mt-1.5 text-gray-900 leading-relaxed whitespace-pre-line">{addressText}</dd>
          </div>
        ) : null}
        {phone ? (
          <div>
            <dt className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Phone</dt>
            <dd className="mt-1.5">
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="text-yelp-red font-semibold hover:underline"
              >
                {phone}
              </a>
            </dd>
          </div>
        ) : null}
        {website_url ? (
          <div>
            <dt className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Website</dt>
            <dd className="mt-1.5 truncate">
              <a
                href={website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yelp-red font-semibold hover:underline"
              >
                {website_url.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </div>
        ) : null}
        {transactions?.length ? (
          <div>
            <dt className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Offers</dt>
            <dd className="mt-1.5 text-gray-900 capitalize">
              {transactions.join(" • ").replace(/_/g, " ")}
            </dd>
          </div>
        ) : null}
      </dl>
      {hasMap ? (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <dt className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Map</dt>
          <div className="mt-2 h-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            {mapEmbedSrc ? (
              <iframe
                title="Restaurant location map"
                src={mapEmbedSrc}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : null}
          </div>
          {mapsHref ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-xs font-semibold text-yelp-red hover:underline"
            >
              Open in Maps
            </a>
          ) : null}
        </div>
      ) : null}
      {hours?.length ? (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <dt className="text-gray-500 font-semibold text-xs uppercase tracking-wide">Hours</dt>
          <dd className="mt-2 space-y-1.5 text-sm text-gray-900">
            {[...(hours || [])]
              .sort((a, b) => (a.day ?? 99) - (b.day ?? 99))
              .map((h, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span>{DAY_NAMES[h.day] ?? `Day ${h.day}`}</span>
                  <span>
                    {h.start && h.end
                      ? `${formatTime(h.start)} – ${formatTime(h.end)}`
                      : "Closed"}
                  </span>
                </div>
              ))}
          </dd>
        </div>
      ) : null}
    </section>
  );
}
