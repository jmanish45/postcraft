import { useState, useEffect } from "react";
import {
  Plus,
  Sparkles,
  ArrowUpRight,
  LoaderCircle,
  Hash,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  X,
  ExternalLink,
} from "lucide-react";

import Header from "./components/Header";
import SampleCard from "./components/SampleCard";
import GeneratedPosts from "./components/GeneratedPosts";
import ApiKeyPage from "./components/ApiKeyPage";
import {
  getSavedPosts,
  savePostsToStorage,
  clearSavedPostsFromStorage,
  clearLastPostTime,
  getUserApiKey,
} from "./utils/storage";

export default function App() {
  const [posts, setPosts] = useState(() => getSavedPosts());
  const [activeTab, setActiveTab] = useState(() => {
    // If user already has saved drafts, default to drafts tab, else create tab
    const saved = getSavedPosts();
    return saved.length > 0 ? "posts" : "create";
  });

  // Linear form inputs
  const [samples, setSamples] = useState([""]);
  const [hashtags, setHashtags] = useState("");
  const [language, setLanguage] = useState("English");
  const [outputCount, setOutputCount] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [showMissingKeyModal, setShowMissingKeyModal] = useState(false);

  // Track if user has a Groq key saved in localStorage
  const [hasStoredKey, setHasStoredKey] = useState(() =>
    Boolean(getUserApiKey("groq")?.trim())
  );

  // Sync key presence whenever active tab changes (e.g. returning from API Key setup)
  useEffect(() => {
    setHasStoredKey(Boolean(getUserApiKey("groq")?.trim()));
  }, [activeTab]);

  const unpostedCount = posts.filter((p) => !p.isPosted).length;

  const addSample = () => {
    if (samples.length >= 10) return;
    setSamples((previous) => [...previous, ""]);
  };

  const updateSample = (index, value) => {
    setSamples((previous) =>
      previous.map((sample, i) => (i === index ? value : sample))
    );
  };

  const removeSample = (index) => {
    if (samples.length === 1) {
      setSamples([""]);
      return;
    }

    setSamples((previous) => previous.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    const validSamples = samples
      .map((content) => content.trim())
      .filter(Boolean);

    if (validSamples.length === 0) {
      setError("Please add at least one non-empty sample post before generating.");
      return;
    }

    // Check if the user has inserted their Groq key in website storage
    const userApiKey = getUserApiKey("groq")?.trim();

    if (!userApiKey) {
      setShowMissingKeyModal(true);
      setError("Groq API key required. Please insert your Groq key in the API Key page.");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      provider: "groq",
      api_key: userApiKey,
      hashtags: hashtags
        .split(/[\s,]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
      samples: validSamples.map((content, index) => ({
        id: index + 1,
        content,
      })),
      output_count: Number(outputCount),
      language,
    };

    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${apiBase}/api/generate-posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to generate drafts.");
      }

      const generated = data.generated_posts || [];
      const newItems = generated.map((p, idx) => ({
        id: `${Date.now()}_${idx}`,
        content: p.content,
        based_on: p.based_on || [],
        verification_status: p.verification_status || "needs_review",
        createdAt: new Date().toISOString(),
        isPosted: false,
        postedAt: null,
      }));

      // Prepend new posts and save to localStorage
      const updatedList = [...newItems, ...posts];
      setPosts(updatedList);
      savePostsToStorage(updatedList);

      // Automatically navigate to Generated Posts page
      setActiveTab("posts");
      window.scrollTo({ top: 0, behavior: "smooth" });

      setNotification(`Generated ${newItems.length} fresh drafts! Ready to post on X.`);
      setTimeout(() => setNotification(""), 4500);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the server. Please check your network or API key."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePost = (id, newContent) => {
    const updated = posts.map((p) =>
      p.id === id ? { ...p, content: newContent } : p
    );
    setPosts(updated);
    savePostsToStorage(updated);
  };

  const handleTogglePosted = (id, forceStatus) => {
    const updated = posts.map((p) => {
      if (p.id !== id) return p;
      const nextStatus =
        typeof forceStatus === "boolean" ? forceStatus : !p.isPosted;
      return {
        ...p,
        isPosted: nextStatus,
        postedAt: nextStatus ? new Date().toISOString() : null,
      };
    });
    setPosts(updated);
    savePostsToStorage(updated);
  };

  const handleDeletePost = (id) => {
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    savePostsToStorage(updated);
  };

  const handleClearAll = () => {
    setPosts([]);
    clearSavedPostsFromStorage();
    clearLastPostTime();
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111] antialiased">
      {/* Sticky Header with Mobile-Ready Segment Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={posts.length}
        unpostedCount={unpostedCount}
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div className="sticky top-16 z-20 mx-auto max-w-md px-4 pt-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* VIEW 1: GENERATE / CREATE POSTS */}
        {activeTab === "create" && (
          <div className="mx-auto max-w-2xl space-y-6 animate-in fade-in duration-200">
            {/* Hero Section */}
            <section className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 shadow-xs">
                  <Sparkles size={12} />
                  AI Editorial Assistant
                </div>

                {/* Live Groq Key Status Indicator */}
                {hasStoredKey ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("key")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-semibold text-neutral-700 hover:border-black transition shadow-2xs"
                    title="Click to view or edit your saved Groq key"
                  >
                    <ShieldCheck size={12} className="text-emerald-600 stroke-[2.5]" />
                    <span>Groq Key Active</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab("key")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-200 transition shadow-2xs"
                    title="Click to insert your free Groq key"
                  >
                    <KeyRound size={12} className="text-neutral-900" />
                    <span>
                      Key Needed · <span className="underline font-bold">Insert Groq Key</span>
                    </span>
                  </button>
                )}
              </div>

              <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                Create Distinct
                <br />
                <span className="text-neutral-400">X (Twitter) Posts</span>
              </h1>

              <p className="text-xs leading-6 text-neutral-500 sm:text-sm">
                Add 1 to 10 source posts. The AI will craft original, non-duplicate
                drafts and save them to your device so you can post them one by one.
              </p>

              {/* Notice if old drafts exist from a previous session */}
              {posts.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-neutral-200 bg-neutral-100/70 p-3 text-xs">
                  <span className="text-neutral-600">
                    You have <span className="font-bold text-neutral-900">{posts.length}</span> saved drafts from earlier.
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("posts")}
                      className="font-bold text-black underline hover:text-neutral-700"
                    >
                      View Drafts
                    </button>
                    <span className="text-neutral-300">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Clear all previous drafts for a new day?")) {
                          handleClearAll();
                        }
                      }}
                      className="font-semibold text-neutral-600 underline hover:text-black"
                    >
                      Clear for New Day
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* LINEAR FORM:
                1. Samples
                2. Hashtags
                3. Language
                4. Number of drafts
                5. Generate Button directly underneath */}
            <div className="space-y-6">
              {/* 1. SAMPLES INPUT */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-neutral-700">
                    1. Source Content
                  </h2>
                  <span className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-neutral-600 shadow-xs">
                    {samples.length} / 10
                  </span>
                </div>

                <div className="space-y-3">
                  {samples.map((sample, index) => (
                    <SampleCard
                      key={index}
                      index={index}
                      value={sample}
                      onChange={(value) => updateSample(index, value)}
                      onRemove={() => removeSample(index)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addSample}
                  disabled={samples.length >= 10}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-white text-xs font-bold text-neutral-600 transition hover:border-black hover:text-black active:scale-[0.99] disabled:opacity-40 shadow-xs"
                >
                  <Plus size={16} />
                  <span>Add another sample post</span>
                </button>
              </div>

              {/* 2. REQUIRED HASHTAGS */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <Hash size={13} />
                  <span>2. Required Hashtags</span>
                </label>
                <input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#Topic #Campaign"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-base sm:text-sm outline-none transition focus:border-black focus:bg-white"
                />
                <p className="text-[11px] text-neutral-400">
                  Separated by spaces or commas. Every generated draft will include them.
                </p>
              </div>

              {/* 3. OUTPUT LANGUAGE */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <Globe size={13} />
                  <span>3. Output Language</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-base sm:text-sm font-semibold outline-none transition focus:border-black focus:bg-white"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Hinglish</option>
                </select>
              </div>

              {/* 4. NUMBER OF DRAFTS */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
                    <Sliders size={13} />
                    <span>4. Drafts to Generate</span>
                  </label>
                  <span className="font-heading text-sm font-extrabold text-black">
                    {outputCount} drafts
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={outputCount}
                  onChange={(e) => setOutputCount(e.target.value)}
                  className="w-full accent-black cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>1 draft</span>
                  <span>10 drafts</span>
                </div>
              </div>

              {/* ERROR ALERT WITH DIRECT KEY BUTTON IF KEY MISSING */}
              {error && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-neutral-300 bg-neutral-100 p-3.5 text-xs font-medium text-neutral-900">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle size={16} className="shrink-0 text-neutral-800" />
                    <span>{error}</span>
                  </div>
                  {!hasStoredKey && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("key")}
                      className="self-start sm:self-auto rounded-lg bg-black px-3 py-1.5 text-[11px] font-bold text-white hover:bg-neutral-800 transition shadow-2xs whitespace-nowrap"
                    >
                      Insert Groq Key Now
                    </button>
                  )}
                </div>
              )}

              {/* 5. GENERATE BUTTON (Directly underneath) */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-black px-6 text-sm font-bold text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 shadow-md"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    <span>Crafting original drafts with Groq...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Generate Posts</span>
                    <ArrowUpRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: DEDICATED GENERATED POSTS PAGE */}
        {activeTab === "posts" && (
          <div className="animate-in fade-in duration-200">
            <GeneratedPosts
              posts={posts}
              onUpdatePost={handleUpdatePost}
              onTogglePosted={handleTogglePosted}
              onDeletePost={handleDeletePost}
              onClearAll={handleClearAll}
              onSwitchToCreate={() => setActiveTab("create")}
            />
          </div>
        )}

        {/* VIEW 3: DEDICATED API KEY PAGE */}
        {activeTab === "key" && (
          <ApiKeyPage onBackToCreate={() => setActiveTab("create")} />
        )}
      </main>

      {/* MISSING GROQ API KEY MODAL WINDOW */}
      {showMissingKeyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowMissingKeyModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                <KeyRound size={20} />
              </div>
              <button
                type="button"
                onClick={() => setShowMissingKeyModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="font-heading text-lg font-bold text-neutral-950">
              Insert Groq Key to Generate
            </h3>

            <p className="mt-2 text-xs leading-5 text-neutral-600">
              To generate original drafts without shared server limits, please insert your free Groq API key.
            </p>

            <p className="mt-2 text-[11px] leading-4 text-neutral-400">
              Groq keys are 100% free and stored privately in your browser’s localStorage on this device only.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMissingKeyModal(false);
                  setActiveTab("key");
                }}
                className="w-full rounded-xl bg-black py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800 active:scale-95 shadow-xs"
              >
                Insert Groq Key Now
              </button>

              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 text-center text-[11px] font-semibold text-neutral-600 hover:text-black transition"
              >
                <span>Get Free Key at Groq Console</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
