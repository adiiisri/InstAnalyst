<div align="center">

<img src="https://img.shields.io/badge/InstAnalyst-Instagram%20Downloader-10B981?style=for-the-badge&logo=instagram&logoColor=white" alt="InstAnalyst"/>

# InstAnalyst

### ⚡ Download Instagram Videos, Reels, Photos & Carousels instantly — no login required.

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-insta--analyst.vercel.app-10B981?style=for-the-badge)](https://insta-analyst.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-adiiisri%2FInstaAnalyst-181717?style=for-the-badge&logo=github)](https://github.com/adiiisri/InstaAnalyst)
[![Deploy on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Backend on Render](https://img.shields.io/badge/Backend%20on-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)

---

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎬 **Video Download** | Download full-quality Instagram videos instantly |
| 🎞️ **Reels Download** | Grab any public Instagram Reel |
| 🖼️ **Photo Download** | Download single photos in full resolution |
| 📸 **Carousel Download** | Batch-download all photos from multi-image posts |
| 📖 **Story Download** | Save Instagram Stories before they disappear |
| 🔗 **No Login Required** | Works without any Instagram account or session ID |
| ✂️ **Video Editor** | Trim videos in-browser using FFmpeg WebAssembly |
| 🎨 **Image Editor** | Apply brightness, contrast & saturation filters via HTML5 Canvas |
| 📊 **Account Analytics** | View follower counts, unfollowers & who doesn't follow back |
| 🌙 **Dark / Light Mode** | Toggle between themes with one click |
| 📱 **Responsive Design** | Works on mobile, tablet, and desktop |
| 🔄 **Auto-Retry** | Automatically retries if the server is starting up |

---

## 🚀 Live Demo

> **[https://insta-analyst.vercel.app/](https://insta-analyst.vercel.app/)**

Just paste any public Instagram link and hit Download. No account needed.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** — UI framework
- **Vite** — Build tool & dev server
- **Vanilla CSS** — Custom dark/light themes with CSS variables
- **FFmpeg WASM** (`@ffmpeg/ffmpeg`) — In-browser video trimming
- **HTML5 Canvas** — In-browser image editing

### Backend
- **Node.js + Express** — REST API server
- **instagram-url-direct** — Extracts real CDN download URLs from Instagram
- **Mongoose + MongoDB** — Data persistence (optional, falls back to in-memory)
- **cors, dotenv** — CORS handling and environment config

### Deployment
- **Vercel** — Frontend (auto-deploys on every git push)
- **Render** — Backend (Node.js server)

---

## 📂 Project Structure

```
InstAnalyst/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── db.js              # MongoDB connection (optional)
│   ├── routes/
│   │   └── api.js         # All 7 API endpoints
│   └── models/
│       ├── Media.js       # Schema for downloaded media
│       └── Follower.js    # Schema for follower analytics
│
├── frontend/
│   ├── index.html
│   └── src/
│       ├── App.jsx        # Main UI + all download logic
│       ├── index.css      # All styles (dark/light themes)
│       └── components/
│           ├── VideoEditor.jsx   # In-browser video trim (FFmpeg WASM)
│           └── ImageEditor.jsx   # In-browser image editor (Canvas)
│
└── README.md
```

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js `v18+`
- npm `v9+`
- (Optional) MongoDB Atlas URI for data persistence

### 1. Clone the repository
```bash
git clone https://github.com/adiiisri/InstaAnalyst.git
cd InstaAnalyst
```

### 2. Start the Backend
```bash
cd backend
npm install
npm run dev
```
Backend starts on → **http://localhost:5000**

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend starts on → **http://localhost:3000**

### 4. (Optional) Environment Variables
Create a `.env` file inside `backend/`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/instanalyst
```
> If `MONGODB_URI` is not set, the app runs in **mock mode** — everything works, data just resets on restart.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/api/status` | Server + DB status |
| `POST` | `/api/download` | Extract media URL from Instagram post |
| `GET` | `/api/proxy` | Stream & download media through proxy (bypasses CORS) |
| `GET` | `/api/analytics/summary` | Follower summary stats |
| `GET` | `/api/analytics/unfollowers` | List of users who unfollowed |
| `GET` | `/api/analytics/not-following-back` | Users you follow who don't follow back |
| `GET` | `/api/analytics/user/:username` | Full stats for any public Instagram username |

### Download Endpoint Example
```bash
POST /api/download
Content-Type: application/json

{
  "url": "https://www.instagram.com/reel/DY3YlD4pv6l/",
  "type": "Video"
}
```

**Response:**
```json
{
  "url": "https://www.instagram.com/reel/DY3YlD4pv6l/",
  "title": "Instagram Reel",
  "thumbnail": "https://scontent-*.cdninstagram.com/...mp4",
  "mediaType": "Reel",
  "isCarousel": false,
  "fileSize": "Unknown Size",
  "downloadUrl": "https://scontent-*.cdninstagram.com/...mp4",
  "downloadedAt": "2026-05-28T13:51:03.730Z"
}
```

---

## 🏗️ How It Works

```
User pastes Instagram URL
         │
         ▼
  Frontend (React / Vercel)
  POST /api/download
         │
         ▼
  Backend (Express / Render)
  instagram-url-direct package
  extracts real CDN URL
         │
         ▼
  Returns downloadUrl (Instagram CDN)
         │
         ▼
  Frontend shows result card
         │
         ▼
  User clicks Download
         │
         ▼
  GET /api/proxy?url=<cdn_url>&filename=video.mp4
  (Backend proxies the file to bypass CORS restrictions)
         │
         ▼
  File saved to Downloads folder ✅
```

---

## 🌐 Deployment

### Frontend → Vercel
1. Fork/clone the repo
2. Import to [Vercel](https://vercel.com)
3. Set **Root Directory** to `frontend`
4. Deploy — auto-deploys on every push to `main`

### Backend → Render
1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Add environment variables:
   - `PORT` = `5000`
   - `MONGODB_URI` = your MongoDB Atlas URI (optional)

> ⚠️ **Note:** Render's free tier spins down after 15 minutes of inactivity.
> The frontend has built-in **auto-retry logic** that waits up to 3 minutes for the server to wake up — so it works automatically, just takes ~60 seconds on the first request after inactivity.

---

## 📌 Supported Instagram URL Formats

| Type | Example URL |
|------|------------|
| Reel | `https://www.instagram.com/reel/ABC123/` |
| Video Post | `https://www.instagram.com/p/ABC123/` |
| Photo Post | `https://www.instagram.com/p/ABC123/` |
| Carousel | `https://www.instagram.com/p/ABC123/` (multi-image) |
| Story | `https://www.instagram.com/stories/username/123/` |

> ✅ Works with any **public** Instagram post.
> ❌ Does not work with **private** accounts.

---

## 📜 Commit History

| Date | Commit | Change |
|------|--------|--------|
| 28 May 2026 | `7d81dbd` | Replace Python scraper with `instagram-url-direct` npm package |
| 28 May 2026 | `b7555c8` | Resilient 3-min retry loop with live status + Retry button |
| 28 May 2026 | `a7ef958` | Pre-warm ping + initial retry for Render cold-start |
| 28 May 2026 | `af1e56a` | PEP 668 pip override for Render deployment |
| 28 May 2026 | `db8c70d` | Allow all CORS origins |
| 28 May 2026 | `19059c3` | Fix Python path + install packages during build |
| 28 May 2026 | `e2be270` | Python yt-dlp scraper + browser cookie fallback |
| 25 May 2026 | `806de2e` | In-browser Video & Image editor |
| 25 May 2026 | `95816d6` | Initial commit — full UI, dark/light mode, analytics |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## ⚠️ Disclaimer

This tool is intended for **personal use only**. Only download content you own or have explicit permission to download. Respect Instagram's [Terms of Service](https://help.instagram.com/581066165581870) and content creators' rights.

---

## 👨‍💻 Author

**Aditya Srivastava**
- GitHub: [@adiiisri](https://github.com/adiiisri)
- Live: [insta-analyst.vercel.app](https://insta-analyst.vercel.app/)

---

<div align="center">

Made with ❤️ and ☕

⭐ **Star this repo if you found it useful!** ⭐

</div>
