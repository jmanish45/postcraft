import { PenTool, Bookmark, KeyRound } from "lucide-react";

export default function Header({
  activeTab,
  setActiveTab,
  savedCount = 0,
  unpostedCount = 0,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-3 sm:px-6">
        {/* Brand: Fixed shrink-0 so Postcraft text never wraps or gets hidden */}
        <div
          onClick={() => setActiveTab("create")}
          className="group flex shrink-0 cursor-pointer items-center gap-1.5 sm:gap-2.5 transition active:scale-95 select-none"
          title="Postcraft — Ideas to Impactful Posts"
        >
          <img
            src="/logo-mark.png"
            alt="Postcraft Logo"
            className="h-6 sm:h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />

          <span className="font-heading text-sm sm:text-base font-extrabold tracking-tight leading-tight text-neutral-950 whitespace-nowrap">
            Postcraft
          </span>
        </div>

        {/* Navigation & Dedicated Key Button */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <nav className="flex items-center rounded-xl bg-neutral-100 p-0.5 sm:p-1">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition ${
                activeTab === "create"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <PenTool size={12} className="sm:w-[13px] sm:h-[13px]" />
              <span>Create</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition ${
                activeTab === "posts"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Bookmark size={12} className="sm:w-[13px] sm:h-[13px]" />
              <span>Drafts</span>
              {savedCount > 0 && (
                <span
                  className={`ml-0.5 sm:ml-1 flex h-4 sm:h-5 min-w-[16px] sm:min-w-[20px] items-center justify-center rounded-full px-1 text-[9px] sm:text-[10px] font-extrabold ${
                    unpostedCount > 0
                      ? "bg-black text-white"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {unpostedCount > 0 ? unpostedCount : savedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Dedicated API Key Button */}
          <button
            type="button"
            onClick={() => setActiveTab("key")}
            title="Configure your API key"
            className={`flex items-center gap-1.5 rounded-xl p-1.5 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold transition active:scale-95 ${
              activeTab === "key"
                ? "bg-black text-white shadow-xs"
                : "border border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black"
            }`}
          >
            <KeyRound size={13} />
            <span className="hidden sm:inline">API Key</span>
          </button>
        </div>
      </div>
    </header>
  );
}
