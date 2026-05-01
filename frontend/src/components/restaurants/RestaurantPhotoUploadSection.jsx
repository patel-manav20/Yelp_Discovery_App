import { useRef, useState } from "react";
import { uploadRestaurantPhoto } from "../../services/restaurantService";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export default function RestaurantPhotoUploadSection({
  urls,
  onUrlsChange,
  maxPhotos = 10,
  disabled = false,
  className = "",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const room = Math.max(0, maxPhotos - urls.length);

  const handlePick = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length || room <= 0) return;
    setUploadErr("");
    setUploading(true);
    const toSend = files.slice(0, room);
    const next = [...urls];
    try {
      for (const file of toSend) {
        const url = await uploadRestaurantPhoto(file);
        next.push(url);
        onUrlsChange(next);
      }
    } catch (err) {
      setUploadErr(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i) => {
    onUrlsChange(urls.filter((_, j) => j !== i));
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={handlePick}
          disabled={disabled || uploading || room <= 0}
        />
        <button
          type="button"
          disabled={disabled || uploading || room <= 0}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-sm font-bold text-gray-800 hover:border-yelp-red/50 hover:bg-red-50/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading…" : "Browse files"}
        </button>
      </div>
      {uploadErr ? <p className="mt-2 text-sm text-red-600 font-medium">{uploadErr}</p> : null}

      {urls.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {urls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="relative group rounded-xl border border-gray-200 overflow-hidden bg-gray-100 aspect-[4/3]"
            >
              <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => removeAt(i)}
                className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/60 text-white text-lg font-bold leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-black/80 disabled:opacity-40"
                aria-label={`Remove photo ${i + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No photos yet — use Browse files to add from your computer.</p>
      )}
    </div>
  );
}
