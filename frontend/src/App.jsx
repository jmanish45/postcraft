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
  Download,
  Image as ImageIcon,
} from "lucide-react";

import Header from "./components/Header";
import SampleCard from "./components/SampleCard";
import GeneratedPosts from "./components/GeneratedPosts";
import ApiKeyPage from "./components/ApiKeyPage";
import IntroSplash from "./components/IntroSplash";
import LanguageDropdown from "./components/LanguageDropdown";
import {
  splitCampaignText,
  getSplittablePointsCount,
} from "./utils/textSplitter";
import { getProxiedImageUrl } from "./utils/imageTransformer";
import {
  getSavedPosts,
  savePostsToStorage,
  clearSavedPostsFromStorage,
  clearLastPostTime,
  getUserApiKey,
} from "./utils/storage";

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    // Show aesthetic intro splash on initial website open
    return !sessionStorage.getItem("postcraft_intro_viewed");
  });

  const handleIntroFinish = () => {
    sessionStorage.setItem("postcraft_intro_viewed", "true");
    setShowIntro(false);
  };

  const [posts, setPosts] = useState(() => getSavedPosts());
  const [activeTab, setActiveTab] = useState(() => {
    // If user already has saved drafts, default to drafts tab, else create tab
    const saved = getSavedPosts();
    return saved.length > 0 ? "posts" : "create";
  });

  // Linear form inputs
  const [samples, setSamples] = useState([""]);
  const [openingTag, setOpeningTag] = useState(() => {
    return localStorage.getItem("postcraft_opening_tag") || "";
  });
  const [closingTag, setClosingTag] = useState(() => {
    return localStorage.getItem("postcraft_closing_tag") || "";
  });

  useEffect(() => {
    localStorage.setItem("postcraft_opening_tag", openingTag);
  }, [openingTag]);

  useEffect(() => {
    localStorage.setItem("postcraft_closing_tag", closingTag);
  }, [closingTag]);

  // Campaign Media / Photos state
  const [campaignUrl, setCampaignUrl] = useState(() => {
    return localStorage.getItem("postcraft_campaign_url") || "";
  });
  const [campaignImages, setCampaignImages] = useState(() => {
    try {
      const saved = localStorage.getItem("postcraft_campaign_images");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [fetchingImages, setFetchingImages] = useState(false);

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

  const handleSplitSample = (index) => {
    const targetText = samples[index];
    const parts = splitCampaignText(targetText);
    if (parts.length < 2) return;

    // Replace the clicked sample with the distinct split points
    const newSamples = [
      ...samples.slice(0, index),
      ...parts,
      ...samples.slice(index + 1),
    ];

    // Cap at maximum of 10 samples to respect API bounds
    const capped = newSamples.slice(0, 10);
    setSamples(capped);

    if (newSamples.length > 10) {
      setNotification(`Split into 10 cards (maximum allowed limit).`);
    } else {
      setNotification(`Sample ${index + 1} split into ${parts.length} distinct cards!`);
    }
    setTimeout(() => setNotification(""), 4500);
  };

  const handleSplitAll = () => {
    let anySplit = false;
    const newSamples = [];

    for (let i = 0; i < samples.length; i++) {
      const parts = splitCampaignText(samples[i]);
      if (parts.length >= 2) {
        anySplit = true;
        newSamples.push(...parts);
      } else {
        newSamples.push(samples[i]);
      }
    }

    if (!anySplit) return;

    const capped = newSamples.slice(0, 10);
    setSamples(capped);

    if (newSamples.length > 10) {
      setNotification(`Split all into 10 sample cards (maximum limit reached).`);
    } else {
      setNotification(`Split all multi-point content into ${capped.length} cards!`);
    }
    setTimeout(() => setNotification(""), 4500);
  };

  const handleFetchImages = async () => {
    const url = campaignUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("Please enter a valid campaign URL starting with http:// or https://");
      return;
    }

    setFetchingImages(true);
    setError("");
    try {
      let apiBase = (import.meta.env.VITE_API_URL || "").trim();
      apiBase = apiBase.replace(/\/+$/, "");
      if (apiBase.endsWith("/api")) {
        apiBase = apiBase.slice(0, -4);
      }
      const endpoint = apiBase ? `${apiBase}/api/extract-images` : "/api/extract-images";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not load images from this link.");
      }

      const images = data.images || [];
      if (images.length === 0) {
        setError("No campaign posters or photos detected on this page.");
      } else {
        setCampaignImages(images);
        localStorage.setItem("postcraft_campaign_images", JSON.stringify(images));
        localStorage.setItem("postcraft_campaign_url", url);
        setNotification(`Loaded ${images.length} campaign posters! Each draft will be paired with one.`);
        setTimeout(() => setNotification(""), 4500);
      }
    } catch (err) {
      setError(err.message || "Failed to load campaign images.");
    } finally {
      setFetchingImages(false);
    }
  };

  const handleShufflePostImage = (postId) => {
    if (campaignImages.length <= 1) return;
    const updated = posts.map((p) => {
      if (p.id !== postId) return p;
      const currentIdx = campaignImages.indexOf(p.imageUrl);
      const nextIdx = (currentIdx + 1) % campaignImages.length;
      return { ...p, imageUrl: campaignImages[nextIdx] };
    });
    setPosts(updated);
    savePostsToStorage(updated);
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

    const cleanOpening = openingTag.trim();
    const cleanClosing = closingTag.trim();

    const payload = {
      provider: "groq",
      api_key: userApiKey,
      opening_tag: cleanOpening,
      closing_tag: cleanClosing,
      hashtags: cleanOpening
        ? cleanOpening.split(/\s+/).filter(Boolean)
        : [],
      samples: validSamples.map((content, index) => ({
        id: index + 1,
        content,
      })),
      output_count: Number(outputCount),
      language,
    };

    try {
      // Clean and sanitize API base URL (handles accidental trailing slashes and double /api prefixes)
      let apiBase = (import.meta.env.VITE_API_URL || "").trim();
      apiBase = apiBase.replace(/\/+$/, "");
      if (apiBase.endsWith("/api")) {
        apiBase = apiBase.slice(0, -4);
      }
      const endpoint = apiBase ? `${apiBase}/api/generate-posts` : "/api/generate-posts";

      const response = await fetch(endpoint, {
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
        imageUrl:
          campaignImages.length > 0
            ? campaignImages[idx % campaignImages.length]
            : null,
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
      {/* Aesthetic Intro Splash on Initial Opening */}
      {showIntro && <IntroSplash onFinish={handleIntroFinish} />}

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
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 shadow-2xs">
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

              <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl text-neutral-950">
                Create Distinct
                <br />
                <span className="text-neutral-400">X (Twitter) Posts</span>
              </h1>

              <p className="text-xs leading-6 text-neutral-500 sm:text-sm">
                Add 1 to 10 source posts. The AI will craft original, non-duplicate
                drafts (250–279 chars) and save them to your device so you can post them one by one.
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-neutral-700">
                      1. Source Content
                    </h2>
                    {samples.length > 1 &&
                      samples.some((s) => getSplittablePointsCount(s) >= 2) && (
                        <button
                          type="button"
                          onClick={handleSplitAll}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-900 transition hover:bg-black hover:text-white hover:border-black active:scale-95 shadow-2xs"
                          title="Split all multi-point samples into separate cards"
                        >
                          <Sparkles size={12} className="text-amber-500" />
                          <span>Auto-Split All Samples</span>
                        </button>
                      )}
                  </div>
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
                      onSplit={() => handleSplitSample(index)}
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

              {/* CAMPAIGN MEDIA / PHOTOS (OPTIONAL) */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
                    <ImageIcon size={13} />
                    <span>Campaign Photos / Media Link (Optional)</span>
                  </label>
                  {campaignImages.length > 0 && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-800">
                      {campaignImages.length} photos ready
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    value={campaignUrl}
                    onChange={(e) => setCampaignUrl(e.target.value)}
                    placeholder="e.g. https://www.satsaheb.org/kist-11-12-english/"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-base sm:text-sm outline-none transition focus:border-black focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleFetchImages}
                    disabled={fetchingImages || !campaignUrl.trim()}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50 active:scale-95 shadow-2xs"
                  >
                    {fetchingImages ? (
                      <>
                        <LoaderCircle size={14} className="animate-spin" />
                        <span className="hidden sm:inline">Fetching...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Load Photos</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Thumbnail Strip of loaded campaign photos */}
                {campaignImages.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>✨ {campaignImages.length} campaign posters loaded. Each draft will automatically pair with one!</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCampaignImages([]);
                          localStorage.removeItem("postcraft_campaign_images");
                        }}
                        className="text-neutral-400 hover:text-black underline"
                      >
                        Clear Photos
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                      {campaignImages.slice(0, 10).map((imgUrl, i) => (
                        <img
                          key={i}
                          src={getProxiedImageUrl(imgUrl)}
                          alt={`Campaign preview ${i + 1}`}
                          className="h-14 w-14 shrink-0 rounded-lg object-cover border border-neutral-200 shadow-2xs hover:scale-105 transition"
                        />
                      ))}
                      {campaignImages.length > 10 && (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-[10px] font-bold text-neutral-400">
                          +{campaignImages.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. CAMPAIGN HASHTAGS & OPTIONAL CLOSING LINE */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
                    <Hash size={13} />
                    <span>2. Campaign Tags & Closing Line</span>
                  </label>
                  <span className="hidden text-[11px] font-medium text-neutral-400 sm:inline">
                    Opening Tag + Draft + Optional Footer
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Field A: Opening Tag */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-700">
                        Opening Hashtag(s) <span className="font-normal text-neutral-400">(placed at start)</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Top of Tweet
                      </span>
                    </div>
                    <input
                      value={openingTag}
                      onChange={(e) => setOpeningTag(e.target.value)}
                      placeholder="#Shastrarth_KaShankhnadPart12"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-base sm:text-sm outline-none transition focus:border-black focus:bg-white"
                    />
                  </div>

                  {/* Field B: Closing Line (Optional) */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-700">
                        Closing Line / Channel <span className="font-normal text-neutral-400">(Optional)</span>
                      </span>
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        Space Permitting
                      </span>
                    </div>
                    <input
                      value={closingTag}
                      onChange={(e) => setClosingTag(e.target.value)}
                      placeholder="Sant RampalJi Yt Channel"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-base sm:text-sm outline-none transition focus:border-black focus:bg-white"
                    />
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Enforced only if the tweet has room within 279 characters; automatically skipped if the message needs the space.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. OUTPUT LANGUAGE */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs space-y-2.5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <Globe size={13} />
                  <span>3. Output Language</span>
                </label>
                <LanguageDropdown value={language} onChange={setLanguage} />
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
              campaignImages={campaignImages}
              onShufflePostImage={handleShufflePostImage}
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
