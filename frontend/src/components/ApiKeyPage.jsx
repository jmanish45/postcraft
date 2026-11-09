import { useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  ShieldCheck,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { getUserApiKey, saveUserApiKey, clearUserApiKey } from "../utils/storage";

export default function ApiKeyPage({ onBackToCreate }) {
  const [key, setKey] = useState(() => getUserApiKey("groq"));
  const [showKey, setShowKey] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = () => {
    saveUserApiKey("groq", key.trim());
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm("Remove your saved API key from this device?")) {
      clearUserApiKey("groq");
      setKey("");
    }
  };

  return (
    <div className="mx-auto max-w-xl animate-in fade-in duration-200">
      <button
        type="button"
        onClick={onBackToCreate}
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-black transition"
      >
        <ArrowLeft size={14} />
        <span>Back to Create</span>
      </button>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="font-heading text-xl font-extrabold tracking-tight">
              API Key Setup
            </h2>
            <p className="text-xs text-neutral-500">
              Stored securely on your device. Never shared with anyone.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Groq API Key
              </label>
              {key.trim() && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <ShieldCheck size={13} />
                  Active on device
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3.5 pl-3.5 pr-10 text-base sm:text-sm font-mono outline-none transition focus:border-black focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-800 underline hover:text-black"
            >
              <span>Get free Groq key in 30 seconds</span>
              <ExternalLink size={12} />
            </a>

            <div className="flex items-center gap-2">
              {key.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-black active:scale-95 shadow-xs"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-black px-5 text-xs font-bold text-white transition hover:bg-neutral-800 active:scale-95 shadow-xs"
              >
                {savedStatus ? (
                  <>
                    <Check size={14} className="text-emerald-400 stroke-[3]" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Key</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-100 pt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Why enter your own key?
          </h4>
          <p className="mt-2 text-xs leading-6 text-neutral-500">
            Groq offers a free tier with ultra-fast generation. By saving your own
            key on this device, you won't be limited by shared server quotas and your
            drafts will always generate instantly.
          </p>
        </div>
      </div>
    </div>
  );
}

