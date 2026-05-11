# MABlytic — Personalized Ad Recommendation PWA

> Formerly **ADWise**. A full-stack Progressive Web App that delivers personalized advertisements using rule-based preference matching (Phase 2) with a clear upgrade path to Multi-Armed Bandit reinforcement learning (Phase 3).

---

## Table of Contents
1. [Project Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Credentials (Seed Data)](#credentials)
5. [Installation & Setup](#setup)
6. [Firebase Hosting (Step-by-Step)](#firebase)
7. [PWA Features](#pwa)
8. [Push Notifications Setup](#push)
9. [Where User Data Is Stored](#data-storage)
10. [Multi-Armed Bandit — Phase 3 Plan](#mab)
11. [API Reference](#api)
12. [Changelog](#changelog)

---

## Overview <a name="overview"></a>

MABlytic demonstrates a complete ad-tech pipeline:

- **Backend**: FastAPI + SQLAlchemy + SQLite  
- **Frontend**: Vanilla JS PWA (installable, offline-capable)  
- **Ad Serving**: Rule-based preference matching (category tags)  
- **A/B Testing**: Variant A and B only (Variant C removed)  
- **Analytics**: Real-time interaction tracking (views + clicks → CTR)  
- **Auth**: Username/password registration with SHA-256 hashing  
- **Push Notifications**: Web Push via VAPID keys (pywebpush)  
- **Phase 3**: Multi-Armed Bandit ready (see section below)

---

## Tech Stack <a name="tech-stack"></a>

| Layer     | Technology |
|-----------|-----------|
| Backend   | Python 3.11+, FastAPI, Uvicorn |
| ORM       | SQLAlchemy 2.0 |
| Database  | SQLite (`ad_recommender.db`) |
| Validation| Pydantic 2.x |
| Push      | pywebpush, py-vapid |
| Frontend  | HTML5, CSS3, Vanilla JS (ES2022) |
| PWA       | Service Worker, Web App Manifest, Web Push API |
| Hosting   | Firebase Hosting (frontend) + Cloud Run (backend) |

---

## Project Structure <a name="project-structure"></a>

```
mablytic/
│
├── backend/
│   ├── main.py               ← All API endpoints (auth, ads, admin, interactions)
│   ├── models.py             ← SQLAlchemy models (User, Ad, Interaction)
│   ├── schemas.py            ← Pydantic request/response schemas
│   ├── database.py           ← SQLAlchemy engine & session factory
│   ├── seed_data.py          ← Seeds dummy users + ads (run once)
│   ├── requirements.txt      ← Python dependencies
│   └── ad_recommender.db     ← SQLite DB (auto-created on first run)
│
├── frontend/
│   ├── index.html            ← Login page (entry point / start_url)
│   ├── register.html         ← Multi-step user registration
│   ├── feed.html             ← User news feed with personalized ads
│   ├── admin.html            ← Admin dashboard (analytics, users, ads)
│   ├── manifest.json         ← PWA manifest (installability)
│   ├── sw.js                 ← Service worker (network-first + push)
│   ├── icon_generator.html   ← Tool to generate and download PWA icons
│   └── icons/
│       ├── icon-72.png       ← Required PWA icon sizes
│       ├── icon-96.png
│       ├── icon-128.png
│       ├── icon-144.png
│       ├── icon-152.png
│       ├── icon-192.png      ← Maskable — used by Android splash
│       ├── icon-384.png
│       └── icon-512.png      ← Maskable — used by install prompt
│
├── firebase.json             ← Firebase Hosting configuration
├── .firebaserc               ← Firebase project ID binding
├── .gitignore
└── README.md
```

> **Note on file paths in the code**: The API base URL is hardcoded as  
> `const API = "http://127.0.0.1:8000"` in all frontend files.  
> Change this to your Cloud Run URL when deploying to production.

---

## Credentials (Seed Data) <a name="credentials"></a>

Run `python seed_data.py` once after starting the backend.

| Role  | Username | Password | Preferences          |
|-------|----------|----------|---------------------|
| Admin | `admin`  | `Admin123` | all categories     |
| User  | `alice`  | `Tech12`   | tech, gaming       |
| User  | `bobfit` | `Fit456`   | fitness, health    |
| User  | `carol`  | `Food78`   | food, travel       |
| User  | `davidg` | `Game12`   | gaming, sports     |
| User  | `emmaed` | `Book34`   | books, education   |

Password rules enforced at registration:
- Letters and numbers only (`[a-zA-Z0-9]`)
- Minimum 6 characters, maximum 8 characters
- Username: letters and numbers only, no spaces

---

## Installation & Setup <a name="setup"></a>

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# First run only — seed dummy data:
python seed_data.py
```

Swagger UI: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
python -m http.server 8081
```

Open: http://127.0.0.1:8081

### Icons (required for PWA install)

1. Open `frontend/icon_generator.html` in your browser
2. Choose one of the 4 icon designs
3. Click "Download All Sizes" — 8 PNG files download automatically
4. Place them in `frontend/icons/` with names: `icon-72.png` through `icon-512.png`

---

## Firebase Hosting (Step-by-Step) <a name="firebase"></a>

### Prerequisites
- A Google account
- Node.js 18+ installed (https://nodejs.org)
- Your code pushed to GitHub

### Step 1 — Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2 — Login to Firebase

```bash
firebase login
```

A browser window opens — sign in with your Google account.

### Step 3 — Create a Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `mablytic` → Create
3. Note your **Project ID** (e.g. `mablytic-abc12`)

### Step 4 — Initialize Firebase in your repo

From the root of your project:

```bash
firebase init hosting
```

When prompted:
- **Which Firebase project?** → Select the one you just created
- **Public directory?** → type `frontend`
- **Configure as SPA?** → `No` (we handle routing manually)
- **Set up automatic builds with GitHub?** → `Yes` (optional — enables CI/CD)
- **Overwrite index.html?** → `No`

This creates `firebase.json` and `.firebaserc` (already provided in this repo).

### Step 5 — Edit `.firebaserc`

```json
{
  "projects": {
    "default": "YOUR-FIREBASE-PROJECT-ID"
  }
}
```

### Step 6 — Deploy frontend

```bash
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR-PROJECT-ID.web.app`

### Step 7 — Deploy backend (Cloud Run)

The FastAPI backend must be hosted separately. Cloud Run is the easiest option.

**A) Create a `Dockerfile` in `/backend`:**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**B) Deploy to Cloud Run:**

```bash
cd backend
gcloud run deploy mablytic-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

Note the Cloud Run URL (e.g. `https://mablytic-api-xxxx.run.app`)

**C) Update the API URL in all frontend files:**

In `feed.html`, `admin.html`, `index.html`, `register.html` — change:
```js
const API = "http://127.0.0.1:8000";
```
to:
```js
const API = "https://mablytic-api-xxxx.run.app";
```

Also update `firebase.json`'s CORS origins and `main.py`'s `origins` list to include  
`https://YOUR-PROJECT-ID.web.app`.

**D) Switch database**: SQLite does not persist between Cloud Run deployments.  
Replace it with Cloud SQL (PostgreSQL) or Firebase Firestore for production.

### Step 8 — GitHub CI/CD (optional but recommended)

During `firebase init`, if you enabled GitHub Actions, a `.github/workflows/firebase-hosting-*.yml`  
file is created automatically. Every push to `main` triggers a deploy.

---

## PWA Features <a name="pwa"></a>

| Feature | Status |
|---------|--------|
| Installable (Add to Home Screen) | ✅ via manifest.json + SW |
| Offline fallback (cached pages) | ✅ Network-first with cache fallback |
| Background cache update | ✅ Fetches fresh, stores in background |
| Push notifications | ✅ Web Push API + VAPID |
| Splash screen | ✅ Animated on every page load |
| Right-click & DevTools shortcuts disabled | ✅ JS event prevention |
| App shortcuts | ✅ Feed + Admin in manifest |
| Maskable icons | ✅ 192px + 512px |

### Service Worker Strategy

```
HTML / JS / CSS  →  Network-First (serve fresh, cache in background)
Images / Icons   →  Cache-First  (long-lived assets)
API calls (:8000) →  Pass-through (never cached)
```

---

## Push Notifications Setup <a name="push"></a>

### 1. Generate VAPID keys (one-time)

Install Node.js, then run:

```bash
npx web-push generate-vapid-keys
```

Copy the public and private keys.

### 2. Add keys to backend

Create `backend/vapid_keys.py`:

```python
VAPID_PRIVATE_KEY = "your-private-key-here"
VAPID_PUBLIC_KEY  = "your-public-key-here"
VAPID_CLAIMS      = {"sub": "mailto:admin@mablytic.com"}
```

### 3. Add subscription endpoints to main.py

```python
from pywebpush import webpush, WebPushException
from vapid_keys import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_CLAIMS

@app.post("/notifications/subscribe")
def subscribe_push(subscription: dict, db: Session = Depends(get_db)):
    # Store subscription object in DB for this user
    ...

@app.post("/notifications/send-ad")  
def send_push_to_all(db: Session = Depends(get_db)):
    # Load all subscriptions and call webpush() for each
    ...
```

### 4. Frontend (already in sw.js)

The service worker handles `push` events and shows notifications.  
The feed page requests permission and subscribes using the VAPID public key.

---

## Where User Data Is Stored <a name="data-storage"></a>

All user data is stored in the **SQLite database file**:

```
backend/ad_recommender.db
```

This file is created automatically the first time you run the backend.  
Inside it, the `users` table contains every registered user with columns:

| Column | Description |
|--------|-------------|
| `id` | Auto-increment primary key |
| `username` | Unique, alphanumeric |
| `password_hash` | SHA-256 hash of password |
| `first_name`, `last_name` | Personal info |
| `email` | Unique |
| `gender` | Self-reported |
| `age` | Integer |
| `preferences` | Comma-separated category list |
| `is_admin` | Boolean |
| `created_at` | Timestamp |

The `ads` and `interactions` tables store ad content and all view/click events respectively.

**In production** (Firebase/Cloud Run), replace SQLite with:
- **Firebase Firestore** (NoSQL, scales automatically)
- **Cloud SQL** (PostgreSQL, most similar to SQLite)

---

## Multi-Armed Bandit — Phase 3 Plan <a name="mab"></a>

Currently (Phase 2), ads are served by simple preference-matching. Phase 3 replaces  
`/serve-ad/{user_id}` with a **Multi-Armed Bandit** algorithm.

### What is a Multi-Armed Bandit?

Imagine a row of slot machines ("arms"). Each arm has an unknown payout rate (CTR).  
The bandit algorithm explores different arms to learn their rates, while simultaneously  
exploiting the best-performing ones. Applied to ads:

- Each **ad** is an "arm"  
- Each **click** is a reward (positive signal)  
- Each **view without click** is no reward  
- The algorithm dynamically serves the ad most likely to be clicked **for this user**

### Recommended Algorithm: Thompson Sampling

Thompson Sampling maintains a **Beta distribution** `Beta(α, β)` for each ad per user segment:

- `α` = number of clicks (successes) + 1  
- `β` = number of views without a click (failures) + 1  

To serve an ad: sample a random value from each Beta distribution, serve the ad with the  
highest sampled value. This naturally balances exploration (trying new ads) and exploitation  
(serving proven performers).

### What needs to be added

**1. New database table**: `BanditStats`  
```python
class BanditStats(Base):
    __tablename__ = "bandit_stats"
    id         = Column(Integer, primary_key=True)
    ad_id      = Column(Integer, ForeignKey("ads.id"))
    category   = Column(String)   # group by user preference segment
    alpha      = Column(Float, default=1.0)  # clicks + 1
    beta       = Column(Float, default=1.0)  # non-clicks + 1
    updated_at = Column(DateTime, server_default=func.now())
```

**2. New endpoint**: `GET /serve-ad-ml/{user_id}`  
```python
import numpy as np

def thompson_sample(alpha, beta):
    return np.random.beta(alpha, beta)

@app.get("/serve-ad-ml/{user_id}")
def serve_ad_ml(user_id, db):
    user = get_user(user_id)
    prefs = user.preferences.split(",")
    # Get all ads matching user preferences
    candidates = db.query(Ad).filter(Ad.category.in_(prefs)).all()
    # Sample from each ad's Beta distribution
    scores = []
    for ad in candidates:
        stats = db.query(BanditStats).filter_by(ad_id=ad.id, category=ad.category).first()
        if not stats:
            stats = BanditStats(ad_id=ad.id, category=ad.category)
        score = thompson_sample(stats.alpha, stats.beta)
        scores.append((score, ad))
    # Serve the highest-scoring ad
    return max(scores, key=lambda x: x[0])[1]
```

**3. Update interaction logging** to trigger bandit updates:  
When a `click` is logged → increment `alpha` for that ad.  
When a `view` without subsequent click → increment `beta`.

**4. Segment-aware bandits** (advanced): Maintain separate `(alpha, beta)` pairs  
per `(ad_id, user_preference_category)` tuple so gaming ads learn separately  
from tech ads, even for the same ad if it spans multiple categories.

### How it will improve the system

| Metric | Phase 2 (Rules) | Phase 3 (Bandit) |
|--------|----------------|-----------------|
| Ad selection | Random from matching category | Probability-weighted by CTR history |
| New ads | Equal chance as established ads | Explored automatically |
| Underperforming ads | Keep getting served | Gradually deprioritized |
| Personalization | Category-level only | Ad-level, per user segment |
| Convergence | Never improves | CTR improves over ~200-500 interactions |

### Library to use

```bash
pip install numpy scipy
```

No dedicated bandit library is needed — `numpy.random.beta()` is all that's required  
for Thompson Sampling.

---

## API Reference <a name="api"></a>

All endpoints documented at: `http://127.0.0.1:8000/docs`

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| GET | `/auth/profile/{id}` | Get full profile |

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/` | Create minimal user (legacy) |
| GET | `/users/` | List all users |
| GET | `/users/{id}` | Get single user |
| DELETE | `/users/{id}` | Delete user |

### Ads
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ads/` | Create ad (A/B only) |
| GET | `/ads/` | List all ads |
| GET | `/ads/{id}` | Get single ad |
| DELETE | `/ads/{id}` | Delete ad |

### Ad Serving
| Method | Path | Description |
|--------|------|-------------|
| GET | `/serve-ad/{user_id}` | Serve personalized ad (rule-based) |

### Interactions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/interactions/` | Log view or click |
| GET | `/interactions/` | List all interactions |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard-stats` | Global KPIs |
| GET | `/admin/analytics` | Per-ad CTR |
| GET | `/admin/users` | All users |
| GET | `/admin/ads` | All ads |
| GET | `/admin/analytics/user/{id}` | User analytics |
| GET | `/admin/analytics/ad/{id}` | Ad analytics |
| GET | `/admin/history` | Interaction log |
| POST | `/admin/users` | Create persona |

### Database
| Method | Path | Description |
|--------|------|-------------|
| POST | `/clear-database/` | Delete all data |

---

## Changelog <a name="changelog"></a>

### v3.0 (Current)
- **Renamed** ADWise → **MABlytic** throughout
- **Registration**: Full user profile (name, email, gender, age, preferences)
- **Login**: Role-based (User/Admin) with redirect
- **Feed**: News articles (same for all) + personalized ads (per preferences)
- **PWA**: Network-first SW, Web Push notifications, splash screen, right-click disabled
- **Icons**: 4 icon options via `icon_generator.html`
- **Admin**: Removed Quick Actions, CTR Chart, Create Persona, Ads Console sections
- **A/B Testing**: Variant C removed — A and B only
- **Auth**: SHA-256 password hashing, validation on both frontend and backend
- **New endpoints**: DELETE /users/{id}, DELETE /ads/{id}, GET /users/, GET /auth/profile/{id}
- **Firebase**: `firebase.json` config provided
- **requirements.txt**: Added pywebpush, py-vapid, cryptography

### v2.0
- Admin dashboard with all Swagger endpoints
- Multi-step registration
- Seeded dummy users with credentials

### v1.0
- Initial release: FastAPI backend, PWA frontend, basic ad serving