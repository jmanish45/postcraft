import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

export default function IntroSplash({ onFinish }) {
  const [stage, setStage] = useState("enter"); // 'enter' | 'shimmer' | 'exit' | 'done'

  useEffect(() => {
    // Stage 1: Shimmer sweep after 400ms
    const t1 = setTimeout(() => setStage("shimmer"), 400);

    // Stage 2: Smooth exit after 1500ms
    const t2 = setTimeout(() => setStage("exit"), 1500);

    // Stage 3: Fully unmount after 2000ms
    const t3 = setTimeout(() => {
      setStage("done");
      if (onFinish) onFinish();
    }, 2050);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  if (stage === "done") return null;

  const isExiting = stage === "exit";

  return (
    <div
      onClick={() => {
        setStage("done");
        if (onFinish) onFinish();
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white cursor-pointer select-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Subtle background ambient radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,0,0,0.035),transparent_65%)] pointer-events-none" />

      {/* Centered Brand Presentation */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-intro-reveal">
        {/* Soft pulse glow behind the emblem */}
        <div className="relative mb-6">
          <div className="absolute -inset-6 rounded-full bg-neutral-200/50 blur-2xl animate-logo-glow" />

          {/* Floating Aesthetic Logo */}
          <div className="relative animate-logo-float">
            <img
              src="/logo.png"
              alt="Postcraft"
              className="h-32 sm:h-40 w-auto object-contain drop-shadow-sm"
            />
          </div>
        </div>

        {/* Shimmering Subtitle */}
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-neutral-50 px-3.5 py-1 text-[11px] font-semibold text-neutral-600 shadow-2xs">
          <Sparkles size={12} className="text-neutral-800" />
          <span>AI Editorial Assistant for X</span>
        </div>

        {/* Minimal Progress Line */}
        <div className="mt-8 h-1 w-32 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full bg-black rounded-full transition-all duration-1200 ease-out w-full" />
        </div>

        <p className="mt-3 text-[10px] uppercase tracking-widest text-neutral-400">
          Tap anywhere to skip
        </p>
      </div>
    </div>
  );
}
