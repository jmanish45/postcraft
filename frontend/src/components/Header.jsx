import { Sparkles, PenTool, Bookmark, KeyRound } from "lucide-react";

export default function Header({
  activeTab,
  setActiveTab,
  savedCount = 0,
  unpostedCount = 0,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div
          onClick={() => setActiveTab("create")}
          className="group flex cursor-pointer items-center gap-2.5 transition active:scale-95 select-none"
          title="Postcraft — Ideas to Impactful Posts"
        >
          <img
            src="/logo-mark.png"
            alt="Postcraft"
            className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />

          <div>
            <span className="font-heading text-base font-extrabold tracking-tight sm:text-lg leading-tight text-neutral-950">
              Postcraft
            </span>
          </div>
        </div>

        {/* Navigation & Dedicated Key Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center rounded-xl bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "create"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <PenTool size={13} />
              <span>Create</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "posts"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Bookmark size={13} />
              <span>Drafts</span>
              {savedCount > 0 && (
                <span
                  className={`ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ${
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
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
              activeTab === "key"
                ? "bg-black text-white shadow-xs"
                : "border border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black"
            }`}
          >
            <KeyRound size={13} />
            <span className="hidden xs:inline">API Key</span>
          </button>
        </div>
      </div>
    </header>
  );
}
