# Postcraft ✍️

> **AI Editorial Assistant for X (Twitter) Campaigns**  
> Generate original, non-duplicate drafts from multiple source posts to prevent duplicate flags and avoid account suspension.

---

## ⚡ Features

- **Multi-Sample Synthesis**: Ingests 1–10 campaign source posts in a single AI request, extracts distinct facts and scripture references, detects overlaps, and crafts fresh, unique drafts.
- **BYOK (Bring Your Own Key)**: Users provide their own free Groq API key via the website UI. Keys are stored only in the browser's `localStorage` on the user's device—no shared server quotas and zero hosting AI costs.
- **15-Minute Anti-Suspension Cooldown**: Automatically marks drafts as posted, copies to clipboard, opens native X compose, and activates a 15-minute timer with an interactive alert window to prevent rapid-fire spam flags.
- **Accurate X Character Counter**: Full weighted Twitter character counter (URLs count as 23, emojis/CJK count as 2, Latin/Devanagari count as 1).
- **Mobile-First Monochrome UI**: Sleek, professional, modern design with no distracting colors, designed for single-handed mobile workflow.

---

## 🏗️ Project Architecture

```
postcraft/
├── backend/
│   ├── main.py              # FastAPI app (CORS + API + Static frontend serving)
│   ├── ai_service.py        # Groq REST API integration (qwen/qwen3.8-27b)
│   ├── prompts.py           # Campaign prompt engineering & fact-grounding
│   ├── schemas.py           # Pydantic v2 validation models
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Template for environment variables
│   └── .env                 # (Ignored by git - never committed)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ApiKeyPage.jsx      # Standalone API key management page
│   │   │   ├── GeneratedPosts.jsx  # Draft cards, timer, alert modal & X intent
│   │   │   ├── Header.jsx          # Mobile tab bar navigation
│   │   │   ├── SampleCard.jsx      # Source sample card with char count
│   │   │   └── XLogo.jsx           # Official X SVG
│   │   ├── utils/
│   │   │   ├── storage.js          # LocalStorage helper (drafts & keys)
│   │   │   └── twitterCharCount.js # Weighted Twitter character counter
│   │   ├── App.jsx                 # Linear post creation workflow
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .gitignore               # Secrets and builds excluded
└── README.md
```

---

## 🚀 Local Development

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup (React Vite)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🌐 Deployment Options

### Option 1: Unified Single-Service (Recommended for Render / Railway / Fly.io)
FastAPI is pre-configured to automatically serve `frontend/dist` as static files if built!

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Start the FastAPI backend:
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
The entire application (UI + API) will be live at `http://your-domain.com`.

### Option 2: Separate Deployment (Vercel + Render)
- **Backend on Render/Railway**: Deploy `backend/` as a Python web service (Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`).
- **Frontend on Vercel/Netlify**: Deploy `frontend/` as a Vite app. Add the environment variable:
  ```env
  VITE_API_URL=https://your-backend-service.onrender.com
  ```

---

## 🔒 Security & Privacy
- **No API Keys in Git**: Both root `.gitignore` and `backend/.gitignore` ensure `.env` and API keys are never committed.
- **Zero Server State**: User drafts and Groq API keys are stored solely in the user's browser `localStorage`.

