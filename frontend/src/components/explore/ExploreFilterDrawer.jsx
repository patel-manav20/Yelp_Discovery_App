import { useMemo, useState } from "react";
import { cuisineOptions, defaultExploreFilters } from "../../constants/exploreFilters";

const sectionTitle = "text-sm font-bold text-gray-900";
const divider = "border-b border-gray-200";
const checkRow =
  "flex items-center gap-3 py-2.5 cursor-pointer select-none text-sm text-gray-800";

function Checkbox({ id, checked, onChange, disabled, label, hint }) {
  return (
    <label htmlFor={id} className={`${checkRow} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-yelp-red focus:ring-yelp-red h-4 w-4 shrink-0"
      />
      <span className="flex-1 leading-snug">
        {label}
        {hint ? <span className="block text-xs text-gray-500 font-normal mt-0.5">{hint}</span> : null}
      </span>
    </label>
  );
}

export default function ExploreFilterDrawer({ open, draft, setDraft, onApply, onCancel }) {
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  const openNowLabel = useMemo(() => {
    try {
      return new Date().toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [open]);

  const set = (patch) => setDraft({ ...draft, ...patch });

  if (!open) return null;

  const priceLevels = [1, 2, 3, 4];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 bg-black/40 z-[200] cursor-default border-0 p-0 w-full"
        aria-label="Close filters"
        onClick={onCancel}
      />

      <aside
        className="fixed left-0 top-0 bottom-0 z-[210] w-[min(100vw,32rem)] max-w-[100%] sm:max-w-[min(32vw,420px)] bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="explore-filters-title"
      >
        <div className={`px-4 py-4 ${divider}`}>
          <h2 id="explore-filters-title" className="text-lg font-bold text-gray-900">
            Filters
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          <section className={`pb-4 ${divider}`}>
            <h3 className={`${sectionTitle} pt-2 pb-3`}>Price</h3>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden divide-x divide-gray-200">
              {priceLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() =>
                    set({ price: draft.price === level ? null : level })
                  }
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    draft.price === level
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {"$".repeat(level)}
                </button>
              ))}
            </div>
          </section>

          <section className={`py-4 ${divider}`}>
            <h3 className={`${sectionTitle} pb-2`}>Suggested</h3>
            <div className="flex flex-col">
              <Checkbox
                id="f-open-now"
                checked={draft.suggestedOpenNow}
                onChange={(v) => set({ suggestedOpenNow: v })}
                label={`Open Now · ${openNowLabel}`}
                hint="UI only until listings include hours."
              />
              <Checkbox
                id="f-hot-new"
                checked={draft.sortBy === "newest"}
                onChange={(v) => set({ sortBy: v ? "newest" : "rating_desc" })}
                label="Hot and New"
              />
              <Checkbox
                id="f-kids"
                checked={draft.suggestedKids}
                onChange={(v) => set({ suggestedKids: v })}
                label="Good for Kids"
              />
              <Checkbox
                id="f-groups"
                checked={draft.suggestedGroups}
                onChange={(v) => set({ suggestedGroups: v })}
                label="Good for Groups"
              />
              <Checkbox
                id="f-apple"
                checked={draft.suggestedApplePay}
                onChange={(v) => set({ suggestedApplePay: v })}
                label="Accepts Apple Pay"
                hint="UI only — not applied to search yet."
              />
              <Checkbox
                id="f-crypto"
                checked={draft.suggestedCrypto}
                onChange={(v) => set({ suggestedCrypto: v })}
                label="Accepts Cryptocurrency"
                hint="UI only — not applied to search yet."
              />
            </div>
          </section>

          <section className={`py-4 ${divider}`}>
            <h3 className={`${sectionTitle} pb-2`}>Features</h3>
            <div className="flex flex-col">
              {[
                {
                  id: "feat-dogs",
                  key: "featureDogs",
                  label: "Dogs Allowed",
                  hint: "Demo — no field in API yet.",
                },
                {
                  id: "feat-cc",
                  key: "featureCreditCards",
                  label: "Accepts Credit Cards",
                },
                {
                  id: "feat-open",
                  key: "featureOpenToAll",
                  label: "Open to All",
                },
                {
                  id: "feat-appt",
                  key: "featureAppointment",
                  label: "By Appointment Only",
                },
                {
                  id: "feat-coat",
                  key: "featureCoatCheck",
                  label: "Coat Check",
                },
                {
                  id: "feat-flower",
                  key: "featureFlowerDelivery",
                  label: "Flower Delivery",
                },
              ]
                .slice(0, featuresExpanded ? 6 : 2)
                .map((row) => (
                  <Checkbox
                    key={row.id}
                    id={row.id}
                    checked={draft[row.key]}
                    onChange={(v) => set({ [row.key]: v })}
                    label={row.label}
                    hint={row.hint}
                  />
                ))}
            </div>
            <button
              type="button"
              onClick={() => setFeaturesExpanded((e) => !e)}
              className="mt-2 text-sm font-semibold text-[#0073bb] hover:underline"
            >
              {featuresExpanded ? "Show fewer" : "See all"}
            </button>
          </section>

          <section className={`py-4 ${divider}`}>
            <h3 className={`${sectionTitle} pb-2`}>Distance</h3>
            <div className="flex flex-col gap-0" role="radiogroup" aria-label="Distance">
              {[
                { value: "birds_eye", label: "Bird's-eye View" },
                { value: "driving_5", label: "Driving (5 mi.)" },
                { value: "biking_2", label: "Biking (2 mi.)" },
                { value: "walking_1", label: "Walking (1 mi.)" },
                { value: "blocks_4", label: "Within 4 blocks" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 py-2.5 cursor-pointer select-none text-sm text-gray-800"
                >
                  <input
                    type="radio"
                    name="explore-distance"
                    checked={draft.distanceMode === opt.value}
                    onChange={() => set({ distanceMode: opt.value })}
                    className="border-gray-300 text-yelp-red focus:ring-yelp-red h-4 w-4 shrink-0"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Distance filters are visual only in this demo.</p>
          </section>

          <section className={`py-4 ${divider}`}>
            <h3 className={`${sectionTitle} pb-2`}>Category</h3>
            <div className="flex flex-col">
              {cuisineOptions.map((tag) => (
                <label key={tag} className={checkRow}>
                  <input
                    type="checkbox"
                    checked={draft.cuisines?.includes(tag) ?? false}
                    onChange={() => {
                      const cur = draft.cuisines || [];
                      const next = cur.includes(tag)
                        ? cur.filter((c) => c !== tag)
                        : [...cur, tag];
                      set({ cuisines: next });
                    }}
                    className="rounded border-gray-300 text-yelp-red focus:ring-yelp-red h-4 w-4 shrink-0"
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="py-4">
            <h3 className={`${sectionTitle} pb-2`}>More</h3>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Min rating
            </label>
            <select
              value={draft.minRating ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                set({ minRating: v === "" ? null : Number(v) });
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            >
              <option value="">Any</option>
              <option value="3">3+ stars</option>
              <option value="3.5">3.5+ stars</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Dietary
            </label>
            <input
              type="text"
              value={draft.dietary}
              onChange={(e) => set({ dietary: e.target.value })}
              placeholder="e.g. vegan, gluten-free"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 mt-4">
              Ambiance (text search)
            </label>
            <input
              type="text"
              value={draft.ambiance}
              onChange={(e) => set({ ambiance: e.target.value })}
              placeholder="e.g. casual, date night"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              “Good for Kids/Groups” above overrides this while checked.
            </p>
          </section>
        </div>

        <div
          className={`flex items-center justify-between gap-3 px-4 py-4 border-t border-gray-200 bg-white shrink-0`}
        >
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-[#0073bb] hover:underline py-2 px-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-full bg-yelp-red hover:bg-yelp-red-hover text-white text-sm font-bold px-6 py-2.5 shadow-sm transition-colors"
          >
            Apply filters
          </button>
        </div>
      </aside>
    </>
  );
}
