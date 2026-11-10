import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";

const LANGUAGES = [
  {
    id: "English",
    label: "English",
    native: "EN",
    desc: "Standard English for global X campaigns",
  },
  {
    id: "Hindi",
    label: "Hindi",
    native: "हिंदी",
    desc: "देवनागरी लिपि में मूल और प्रामाणिक पोस्ट",
  },
  {
    id: "Hinglish",
    label: "Hinglish",
    native: "Hinglish",
    desc: "Conversational Hindi written in English script",
  },
];

export default function LanguageDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = LANGUAGES.find((l) => l.id === value) || LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* Modern Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex h-12 w-full items-center justify-between rounded-xl border bg-neutral-50 px-3.5 transition active:scale-[0.99] ${
          isOpen
            ? "border-black bg-white ring-2 ring-black/5 shadow-xs"
            : "border-neutral-200 hover:border-neutral-300 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-neutral-200 text-neutral-700 shadow-2xs group-hover:border-neutral-300">
            <Globe size={14} />
          </div>

          <div className="flex items-center gap-2 text-left">
            <span className="text-sm font-bold text-neutral-900">
              {selected.label}
            </span>
            <span className="rounded-md bg-neutral-200/70 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-neutral-700">
              {selected.native}
            </span>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-neutral-400 transition-transform duration-200 group-hover:text-black ${
            isOpen ? "rotate-180 text-black" : ""
          }`}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-1">
            {LANGUAGES.map((lang) => {
              const isCurrent = lang.id === value;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => {
                    onChange(lang.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition ${
                    isCurrent
                      ? "bg-neutral-100/80 text-black"
                      : "hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900">
                        {lang.label}
                      </span>
                      <span className="rounded bg-neutral-200/60 px-1.5 py-0.2 text-[9px] font-bold text-neutral-600">
                        {lang.native}
                      </span>
                    </div>
                    <span className="mt-0.5 text-[11px] text-neutral-400">
                      {lang.desc}
                    </span>
                  </div>

                  {isCurrent && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                      <Check size={11} className="stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

