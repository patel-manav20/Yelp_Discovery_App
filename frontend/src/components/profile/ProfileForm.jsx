import { useRef, useState } from "react";
import { uploadProfilePhoto } from "../../services/userService";

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-yelp-red";

const COUNTRY_OPTIONS = ["US", "IN", "CA", "GB", "AU", "DE", "FR", "MX", "BR", "JP", "CN"];
const US_STATE_OPTIONS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

const GENDER_OPTIONS = ["", "Prefer not to say", "Male", "Female", "Non-binary", "Other"];

export default function ProfileForm({
  initialValues,
  onSubmit,
  submitting = false,
}) {
  const [values, setValues] = useState({
    email: initialValues?.email ?? "",
    display_name: initialValues?.display_name ?? "",
    phone: initialValues?.phone ?? "",
    city: initialValues?.city ?? "",
    state: initialValues?.state ?? "",
    country: initialValues?.country ?? "US",
    languages_text: initialValues?.languages?.join(", ") ?? "",
    gender: initialValues?.gender ?? "",
    bio: initialValues?.bio ?? "",
    avatar_url: initialValues?.avatar_url ?? "",
  });
  const [errors, setErrors] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileRef = useRef(null);

  const handleChange = (name) => (e) => {
    const raw = e.target.value;
    const nextVal =
      name === "country" || name === "state" ? String(raw).toUpperCase() : raw;
    setValues((v) => ({ ...v, [name]: nextVal }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: null }));
  };

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError("");
    try {
      const url = await uploadProfilePhoto(file);
      setValues((v) => ({ ...v, avatar_url: url }));
    } catch (err) {
      setPhotoError(err?.message || "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  const validate = () => {
    const next = {};
    const dn = values.display_name?.trim();
    if (!dn) next.display_name = "Display name is required";
    else if (dn.length > 120) next.display_name = "Display name is too long";

    const email = values.email?.trim();
    if (!email) next.email = "Email is required";
    else if (!/.+@.+\..+/.test(email)) next.email = "Enter a valid email address";

    if (values.phone?.length > 32) next.phone = "Phone is too long";
    if (values.languages_text?.length > 200) next.languages_text = "Languages list is too long";

    const countryUpper = values.country?.trim().toUpperCase();
    if (values.country?.trim().toUpperCase() === "US" && values.state?.trim().length > 0 && values.state.trim().length !== 2) {
      next.state = "Use a 2-letter state code (e.g. CA)";
    }
    if (countryUpper !== "US" && values.state?.trim().length > 64) {
      next.state = "State must be at most 64 characters";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {};
    if (values.email.trim()) payload.email = values.email.trim();
    if (values.display_name.trim()) payload.display_name = values.display_name.trim();
    if (values.phone.trim()) payload.phone = values.phone.trim();
    else payload.phone = null;
    if (values.city.trim()) payload.city = values.city.trim();
    else payload.city = null;
    if (values.state.trim()) payload.state = values.state.trim();
    else payload.state = null;
    if (values.country.trim()) payload.country = values.country.trim();
    else payload.country = null;
    if (values.bio.trim()) payload.bio = values.bio.trim();
    else payload.bio = null;
    const langs = values.languages_text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
    payload.languages = langs.length ? langs : null;

    payload.gender = values.gender.trim() ? values.gender.trim() : null;

    if (values.avatar_url.trim()) payload.avatar_url = values.avatar_url.trim();
    else payload.avatar_url = null;
    onSubmit?.(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
          Display name *
        </label>
        <input
          id="display_name"
          type="text"
          value={values.display_name}
          onChange={handleChange("display_name")}
          className={inputClass}
          placeholder="How you want to be seen"
          maxLength={120}
        />
        {errors.display_name ? (
          <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={handleChange("email")}
          className={inputClass}
          placeholder="you@example.com"
          maxLength={255}
        />
        {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone number
        </label>
        <input
          id="phone"
          type="tel"
          value={values.phone}
          onChange={handleChange("phone")}
          className={inputClass}
          placeholder="(555) 123-4567"
          maxLength={32}
        />
        {errors.phone ? <p className="mt-1 text-sm text-red-600">{errors.phone}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input
            id="city"
            type="text"
            value={values.city}
            onChange={handleChange("city")}
            className={inputClass}
            placeholder="San Jose"
            maxLength={120}
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          {values.country?.trim().toUpperCase() === "US" ? (
            <select
              id="state"
              value={values.state}
              onChange={handleChange("state")}
              className={inputClass}
            >
              <option value="">Select…</option>
              {US_STATE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="state"
              type="text"
              value={values.state}
              onChange={handleChange("state")}
              className={inputClass}
              placeholder="State/Province"
              maxLength={64}
            />
          )}
          {errors.state ? <p className="mt-1 text-sm text-red-600">{errors.state}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
          Country
        </label>
        <select id="country" value={values.country} onChange={handleChange("country")} className={inputClass}>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="languages_text" className="block text-sm font-medium text-gray-700 mb-1">
          Languages (comma-separated)
        </label>
        <input
          id="languages_text"
          type="text"
          value={values.languages_text}
          onChange={handleChange("languages_text")}
          className={inputClass}
          placeholder="English, Hindi, Gujarati"
          maxLength={200}
        />
        {errors.languages_text ? <p className="mt-1 text-sm text-red-600">{errors.languages_text}</p> : null}
      </div>

      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
          Gender
        </label>
        <select id="gender" value={values.gender} onChange={handleChange("gender")} className={inputClass}>
          {GENDER_OPTIONS.map((g) => (
            <option key={g || "none"} value={g}>
              {g || "Select…"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          About me
        </label>
        <textarea
          id="bio"
          rows={3}
          value={values.bio}
          onChange={handleChange("bio")}
          className={`${inputClass} resize-y`}
          placeholder="A bit about you…"
          maxLength={500}
        />
        <p className="mt-1 text-xs text-gray-400 text-right">{values.bio.length} / 500</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Profile photo</label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
            {values.avatar_url ? (
              <img src={values.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400">No photo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} disabled={photoUploading} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoUploading}
              className="px-4 py-2 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-50 shadow-sm"
            >
              {photoUploading ? "Uploading…" : "Upload photo"}
            </button>
            {photoError ? <p className="text-sm text-red-600 font-medium">{photoError}</p> : null}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-2.5 rounded-md text-white text-sm font-semibold bg-yelp-red hover:bg-yelp-red-hover disabled:opacity-50 shadow-sm"
      >
        {submitting ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
