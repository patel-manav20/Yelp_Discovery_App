import { useState } from "react";

function normalizePhotos(photos) {
  if (!photos?.length) return [];
  return photos.map((p, i) =>
    typeof p === "string" ? { id: i, photo_url: p } : p
  );
}

export default function PhotoGallery({ photos = [], className = "" }) {
  const list = normalizePhotos(photos);
  const [active, setActive] = useState(0);

  if (!list.length) {
    return (
      <div
        className={`rounded-xl border border-dashed border-gray-300 bg-surface-muted aspect-video flex items-center justify-center text-gray-500 text-sm ${className}`}
      >
        No photos yet
      </div>
    );
  }

  const main = list[Math.min(active, list.length - 1)];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-[16/10] sm:aspect-[2/1] shadow-inner">
        <img
          src={main.photo_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      {list.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {list.map((p, i) => (
            <button
              key={p.id ?? i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative shrink-0 w-[4.5rem] h-[3.5rem] sm:w-24 sm:h-[4.5rem] rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                i === active
                  ? "border-yelp-red ring-2 ring-red-100 shadow-sm"
                  : "border-gray-200 opacity-85 hover:opacity-100 hover:border-gray-300"
              }`}
            >
              <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
