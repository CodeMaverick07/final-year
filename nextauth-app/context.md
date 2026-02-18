# Project Context: Sanskriti — Manuscript Sharing & Digitization Platform

This file contains comprehensive information about the project structure, technology stack, database design, OCR pipeline, and key workflows. It is intended to provide immediate context for an LLM or developer to understand and extend the application.

---

## 1. Project Overview

**Name**: Sanskriti (built on NextAuth App / AuthKit)
**Goal**: A social media platform for manuscript sharing and digitization. Users upload manuscripts (images, audio recordings, video clips), tag them, interact via likes/comments/bookmarks, follow each other, and discover work through a personalized recommendation feed. The platform also provides automatic OCR (Google Vision), AI-powered text reconstruction (Gemini), and bilingual translation (Hindi + English).

**Core Features**:
- Multi-provider authentication (Google, GitHub, Credentials) via NextAuth.js v5.
- **PWA Support**: Installable Progressive Web App with service worker, offline fallback, and app shortcuts.
- Manuscript upload to AWS S3 (presigned URLs, multi-file per post).
- **PDF Upload Support**: Upload PDF documents directly; processed via Google Vision Document Text Detection API.
- **Camera Capture** (`/capture`): Capture single photos or multiple pages (combined into PDF) using device camera.
- **Audio/Video Recording** (`/record`): Record audio commentary or video narration directly in the browser.
- Automatic OCR/Extraction pipeline:
  - **Images/PDFs**: Google Vision text detection → Gemini AI reconstruction.
  - **Audio**: Gemini multimodal transcription → Gemini AI reconstruction.
  - **Video**: Google Video Intelligence API (Text + Speech) → Gemini AI reconstruction.
- Bilingual translation: Hindi + English in a single Gemini API call, cached per post.
- Social interactions: Like, Comment (threaded), Bookmark, Follow/Unfollow.
- Personalized recommendation feed with scored ranking algorithm.
- **Feed Search**: Search users and posts from `/feed`, including username/title/tag matching.
- **Profile Privacy**: Users can set profile as public/private; private-profile posts are visible only to followers (or owner).
- **Settings**: Dedicated `/settings` page for username + privacy controls.
- **Adaptive Theme**: Light / Dark / System theme support (default: System) using CSS variables.
- User profiles with posts grid, media-type filtered tabs, follower/following lists.
- Follower/following modal visibility is restricted: visible to owner and followers on private profiles.
- **Navigation**: Dedicated Sidebar for authenticated users, hiding global Navbar on protected routes.
- **State Synchronization**: `FeedClient` uses a `useEffect` synchronization pattern to ensure that server-side `revalidatePath` calls update the client-side infinite scroll state.


---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14.2.x (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + CSS variables (light/dark/system themes) |
| **Database** | PostgreSQL 16 (Docker Compose) |
| **ORM** | Prisma v6.x |
| **Authentication** | NextAuth.js v5 (Beta) / Auth.js |
| **Storage** | AWS S3 (presigned upload URLs) |
| **Storage** | AWS S3 (presigned upload URLs) |
| **OCR / Extraction** | Google Cloud Vision (Images) + Video Intelligence (Video) |
| **AI / LLM** | Google Gemini (via `@google/generative-ai`) |
| **UI Libraries** | Radix UI (Dialog, Tabs, Toggle), Embla Carousel, react-dropzone |
| **Utilities** | nanoid, date-fns, zod, react-hot-toast, bcryptjs, jspdf, browser-image-compression |
| **Fonts** | Playfair Display (headings), DM Sans (body) via next/font/google |
| **PWA** | Service Worker, Web App Manifest, Offline support |

---

## 3. Monorepo Structure

The project lives under `final/` with two directories:

### 3a. `nextauth-app/` — Main Next.js Application

```
nextauth-app/
├── app/
│   ├── actions/
│   │   ├── auth.ts             # Server Actions: signUp, signInWithCredentials, signInWithProvider
│   │   ├── upload.ts           # Server Actions: initiateUpload, finalizeUpload (triggers OCR)
│   │   ├── post.ts             # Server Actions: updatePostDetails, deletePost
│   │   ├── settings.ts         # Server Action: updateProfileSettings
│   │   ├── social.ts           # Server Actions: toggleLike, addComment, toggleBookmark, toggleFollow
│   │   ├── feed.ts             # Server Action: fetchFeed (cursor-paginated)
│   │   └── translation.ts     # Server Action: requestTranslation (Gemini Hindi+English, cached)
│   ├── api/
    │   ├── auth/[...nextauth]/route.ts   # NextAuth API Handler
    │   ├── feed/route.ts                 # GET /api/feed?cursor= (paginated feed)
    │   ├── search/route.ts               # GET /api/search?q= (search users + posts)
    │   ├── cron/process-queue/route.ts    # GET — queue worker called by Vercel Cron
    │   ├── dev/trigger-queue/route.ts     # GET — manual queue trigger in development
    │   ├── internal/ocr-pipeline/route.ts # POST — legacy/debug OCR route (not used in app flow)
    │   ├── internal/audio-pipeline/route.ts # POST — legacy/debug audio route
    │   ├── internal/video-pipeline/route.ts # POST — legacy/debug video route
 │   │   ├── posts/[id]/route.ts           # GET /api/posts/:id (single post)
│   │   ├── posts/[id]/ocr-status/route.ts # GET — OCR/translation status polling
│   │   └── upload/complete/route.ts      # POST /api/upload/complete
│   ├── (protected)/            # Authenticated Route Group
│   │   ├── layout.tsx          # Layout with <Sidebar />
│   │   ├── dashboard/page.tsx  # User session info
│   │   ├── feed/
│   │   │   ├── page.tsx        # Recommendation feed (server component)
│   │   │   └── FeedClient.tsx  # Client — infinite scroll
│   │   ├── capture/
│   │   │   ├── page.tsx        # Camera capture page (server shell)
│   │   │   └── CaptureClient.tsx # Multi-step capture flow (single/multiple photos → PDF)
│   │   ├── record/
│   │   │   ├── page.tsx        # Audio/video recording page (server shell)
│   │   │   └── RecordClient.tsx # Multi-step recording flow (audio/video → review → upload)
│   │   ├── saved/page.tsx      # Saved/Liked posts with media filters
│   │   ├── settings/           # Profile settings (username/privacy/theme)
│   │   ├── upload/page.tsx     # Multi-step upload form (supports PDFs)
│   │   ├── profile/
│   │   │   ├── page.tsx        # Redirects to /profile/[username]
│   │   │   └── [username]/     # User profile
│   │   └── post/[id]/          # Post detail + OCR/translation components
│   ├── login/page.tsx          # PUBLIC — login form + OAuth
│   ├── register/page.tsx       # PUBLIC — registration form
│   ├── globals.css             # Editorial dark theme + OCR/translation styles
│   ├── layout.tsx              # Root layout with Google Fonts + Toaster
│   └── page.tsx                # Landing page
├── components/
│   ├── Sidebar.tsx                # Vertical navigation for auth users (includes Saved + Settings + theme toggle)
│   ├── ThemeToggle.tsx            # Light/Dark/System theme switch
│   ├── feed/
│   │   ├── FeedCard.tsx           # Full feed post card (includes 📜 OCR badge)
│   │   ├── LikeButton.tsx         # Optimistic like with useOptimistic
│   │   ├── CommentInput.tsx       # Inline comment input
│   │   ├── BookmarkButton.tsx     # Optimistic bookmark toggle
│   │   ├── FollowButton.tsx       # Optimistic follow/unfollow
│   │   └── MediaCarousel.tsx      # Embla carousel for multi-media posts
│   ├── post/
│   │   ├── OcrStatusBanner.tsx    # Polls OCR status, animated progress indicator
│   │   ├── ManuscriptText.tsx     # Tabbed Raw OCR / Reconstructed text + copy
│   │   └── TranslationPanel.tsx   # Translate button + cached Hindi/English tabs
│   ├── upload/
│   │   ├── DropZone.tsx           # Drag-and-drop file zone (react-dropzone)
│   │   ├── FilePreview.tsx        # File preview card with type badge
│   │   ├── UploadProgress.tsx     # Per-file progress bars
│   │   ├── VisibilityToggle.tsx   # Public/Private toggle
│   │   └── TagInput.tsx           # Tag pill input with comma parsing
│   ├── profile/
│   │   ├── ProfileHeader.tsx      # Avatar, name, bio, follower stats
│   │   ├── PostGrid.tsx           # Aspect-square post grid (includes 📜 OCR badge)
│   │   ├── TabBar.tsx             # Sliding underline tab bar
│   │   └── FollowList.tsx         # Modal list of followers/following
│   ├── ui/
│   │   ├── Avatar.tsx             # Reusable avatar with fallback
│   │   ├── Modal.tsx              # Radix Dialog wrapper
│   │   └── Toast.tsx              # Toast re-export
│   ├── Navbar.tsx                 # Server Component — auth-aware with social nav links
│   ├── OAuthButtons.tsx           # Google/GitHub buttons
│   ├── SignOutButton.tsx          # Client sign-out button
│   └── PwaRegister.tsx            # Service worker registration component
├── lib/
│   ├── prisma.ts               # Prisma Client Singleton
│    ├── s3.ts                   # S3 Client + presigned URL helpers
    ├── feed.ts                 # Recommendation query (scored ranking + ocrStatus)
    ├── gemini.ts               # Gemini API: Reconstruction + Translation + Audio Transcription
    └── videointelligence.ts    # Google Video Intelligence API client
├── prisma/
│   ├── schema.prisma           # Full social media + OCR schema (see §5)
│   └── migrations/             # 3 migration folders
├── public/
│   ├── manifest.json           # PWA manifest with shortcuts
│   ├── sw.js                    # Service worker for offline support
│   ├── offline.html             # Offline fallback page
│   └── icons/                   # PWA icons (icon-192.png, icon-512.png)
├── auth.config.ts              # Edge-compatible Auth config
├── auth.ts                     # Full Auth config with Prisma Adapter
├── middleware.ts               # Route protection
├── docker-compose.yml          # PostgreSQL 16 container (OCR runs from ../ocr/app.py)
├── tailwind.config.ts           # Theme token mapping + animations
├── package.json                # Next.js 14.2.35, all dependencies
└── .env.local                  # Environment variables (see §8)
```

### 3b. `ocr/` — Standalone OCR Service

```
ocr/
├── app.py              # Standalone FastAPI OCR server (Google Vision)
├── requirements.txt    # fastapi, uvicorn, python-multipart, google-cloud-vision
├── image.png           # Test manuscript image
└── venv/               # Python virtual environment
```

This is the active OCR service used by the Next.js app (`OCR_SERVICE_URL`). Run it directly with `cd ocr && python app.py` (serves on port 8001).

---

## 4. Authentication Architecture (NextAuth v5)

Split into two files for Edge Runtime compatibility:

1.  **`auth.config.ts` (Edge Compatible)**: Contains providers (stub Credentials), page config, `authorized` callback. Protects `/dashboard`, `/upload`, `/feed`, `/profile`, `/capture`, `/record`, `/saved`, `/settings`. Redirects logged-in users from auth pages to `/feed`.

2.  **`auth.ts` (Node.js Only)**: Imports `authConfig`, adds PrismaAdapter, full Credentials provider with `prisma.user.findUnique` and `bcrypt.compare`. Exports `auth`, `signIn`, `signOut`, `handlers`.

---

## 5. Database Schema (Prisma)

### NextAuth Models
- **User**: `id`, `name`, `email`, `emailVerified`, `image`, `password` (nullable), `bio`, `username` (unique), `isPrivate` (default false), + relations
- **Account**: OAuth provider details
- **Session**: Database sessions
- **VerificationToken**: Email verification

### Social Models
- **Post**: `title`, `subtitle`, `description`, `isPublic`, `sourceType` (PostSource enum: UPLOAD/CAPTURE/RECORD), `authorId` → media, likes, comments, bookmarks, tags, manuscriptOcr
- **Media**: `postId`, `type` (IMAGE/AUDIO/VIDEO), `url`, `s3Key`, `mimeType`, `size`, `duration`, `width`, `height`, `order`
- **Like**: `userId` + `postId` (unique compound)
- **Comment**: `body`, `userId`, `postId`, `parentId` (self-referencing for threads)
- **Bookmark**: `userId` + `postId` (unique compound)
- **Follow**: `followerId` + `followingId` (unique compound)
- **Tag**: `name` (unique)
- **PostTag**: `postId` + `tagId` (composite PK)
- **Notification**: `recipientId`, `actorId`, `type` (LIKE/COMMENT/FOLLOW/REPLY), `postId`, `commentId`, `read`

### OCR & Translation Model
- **ManuscriptOCR**: One-to-one with Post. Fields:
  - `rawOcrText` (Text) — raw Google Vision output
  - `reconstructedText` (Text, nullable) — Gemini-cleaned version
  - `ocrConfidence` (Float, nullable)
  - `ocrStatus`: `PENDING` → `PROCESSING` → `RECONSTRUCTING` → `DONE` / `FAILED`
  - `translationHindi` / `translationEnglish` (Text, nullable) — cached translations
  - `translationStatus`: `NONE` → `PROCESSING` → `DONE` / `PARTIAL` / `FAILED`

### Post Source Tracking
- **PostSource** enum: `UPLOAD` (traditional file upload), `CAPTURE` (camera capture), `RECORD` (audio/video recording)
- Tracks how content was created for analytics and UI differentiation

---

## 6. Key Workflows

### Upload Flow (Traditional)
1. User fills metadata (title, subtitle, description, tags, visibility) on Step 1
2. User drops files on Step 2 (images/PDFs/audio/video via react-dropzone)
3. Client calls `initiateUpload` server action → creates Post + Media stubs + presigned S3 URLs
4. Client uploads files directly to S3 via XHR PUT with progress tracking
5. Client calls `finalizeUpload`:
   - creates `ManuscriptOCR` stub
   - enqueues async processing job (`ProcessingJob`)
   - triggers PDF→images conversion in background via `/api/internal/pdf-to-images` (non-blocking)
6. Upload UI uses finalize timeout + navigation fallback to avoid getting stuck on the upload screen, then redirects to `/post/[id]`

### Capture Flow (`/capture`)
1. User selects mode: **Single Photo** or **Multiple Pages (PDF)**
2. Camera viewfinder opens with alignment guides
3. User captures photo(s):
   - **Single mode**: Capture → Review → Metadata → Upload
   - **Multiple mode**: Capture multiple photos → "Done" → Review strip → Metadata → Generate PDF → Upload
4. Photos compressed client-side using `browser-image-compression`
5. Multiple photos combined into PDF using `jspdf` (A4 format, maintaining aspect ratio)
6. Upload follows same flow as traditional upload (presigned URL → S3 → OCR pipeline)

### Record Flow (`/record`)
1. User selects mode: **Audio** or **Video**
2. Recording starts automatically:
   - **Audio**: Shows waveform visualizer (32 bars) + timer
   - **Video**: Shows camera preview + timer
3. User stops recording → Review step with playback
4. User can re-record or proceed to metadata
5. Upload follows same flow as traditional upload (presigned URL → S3 → transcription pipeline)

### OCR/Extraction Pipeline (Queue + Cron)

**1. Enqueue (in `finalizeUpload`)**:
- Creates `ManuscriptOCR` with status `PENDING`
- Upserts a `ProcessingJob` row with payload (`imageUrls` / `audioUrl` / `videoUrl`)

**2. Processing Worker**:
- `GET /api/cron/process-queue` claims one pending job atomically
- **IMAGE_OCR**: fetches media (including PDF-derived page images) and calls standalone OCR service at `OCR_SERVICE_URL` (`/ocr`)
- **AUDIO_TRANSCRIPTION**: runs Gemini multimodal transcription
- **VIDEO_EXTRACTION**: runs Video Intelligence extraction

**3. Reconstruction + Completion**:
- Saves raw text (`ocrStatus: RECONSTRUCTING`)
- Runs `runGeminiReconstruction()`
- Saves `reconstructedText` (`ocrStatus: DONE`) and marks queue job `DONE`

**4. Retry Behavior**:
- Retryable failures are requeued with backoff
- Non-retryable failures (e.g. empty OCR text across all images) are marked `FAILED` / `EXHAUSTED`

**5. Queue Self-Heal on Status Poll**:
- `GET /api/posts/[id]/ocr-status` auto-enqueues a missing `ProcessingJob` from existing media when OCR is still pending/processing
- Prevents orphaned `ManuscriptOCR` rows when a finalize step fails after S3 upload

### Translation Flow (On-Demand, Cached)
1. Post detail page shows "🌐 Translate Manuscript" button (only when OCR is `DONE`)
2. User clicks → `requestTranslation()` server action
3. Guard: if already `DONE` → returns cached `hindi` + `english` immediately
4. Guard: if `PROCESSING` → returns "already in progress"
5. Otherwise: single Gemini `runGeminiTranslation()` call → returns `{ hindi, english }` JSON
6. Both translations saved to DB → never re-fetched

### Profile Settings + Privacy
1. User opens `/settings`
2. Updates username and profile privacy (`isPrivate`)
3. Private profile behavior:
   - Only followers (or owner) can view that user's posts
   - Only followers (or owner) can open that user's followers/following modal lists
4. Follow/unfollow refreshes profile state so private-access changes appear immediately

### Feed Search
1. Search input in `/feed` calls `GET /api/search?q=...`
2. Results include two sections:
   - **Users** (name/username match)
   - **Posts** (title/subtitle/description/tag/author match)
3. Privacy filters are enforced in results:
   - Public posts from public profiles
   - Public posts from private profiles only if viewer follows author
   - Own posts always visible

### Feed Algorithm
Scored ranking (computed server-side):
- +10 if post is from someone user follows
- +3 if post shares tags with user's liked posts
- +2 if post created within last 7 days
- +1 if post has >10 likes
- -100 if already liked by user (hide seen)
- -100 if by current user (hide own)
- Only includes public posts the viewer is allowed to access under profile privacy rules
Sorted by score DESC, createdAt DESC. Paginated with cursor.

### Optimistic UI
Uses `useOptimistic` (React 19) for instant feedback. **Implementation Rule**: All optimistic updates (`addOptimistic`) must be wrapped within a `startTransition` block to avoid React warnings and ensure proper state reconciliation.
- Like: toggle heart + count
- Follow: toggle button label
- Bookmark: toggle fill
- Comment: append immediately

---

## 7. Design System

**Theme**: Adaptive manuscript aesthetic — Light / Dark / System (default: System)

| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `--bg` | App background (mode-dependent) |
| `surface` | `--bg-surface` | Card/panel backgrounds |
| `border` | `--border` | Dividers/inputs |
| `accent` | `--accent` | Buttons/highlights |
| `text-primary` | `--text-primary` | Main text |
| `text-muted` | `--text-muted` | Secondary/helper text |
| `like-red` | `--like-red` | Like/error emphasis |

**Fonts**: Playfair Display (headings), DM Sans (body)
**Animations**: Fade-in stagger on feed cards, pulse on like, animated dash border on dropzone, sliding tab indicator, pulse dot on OCR status banner, spinner on translate button, camera shutter button press, audio waveform bars, recording indicator pulse.
**PWA Features**: Service worker caching, offline fallback page, installable app with shortcuts, safe area insets for mobile devices.

---

## 8. Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextauth_db?schema=public"

# Auth
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# OAuth Providers
GOOGLE_CLIENT_ID="..." / GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..." / GITHUB_CLIENT_SECRET="..."

# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="eu-north-1"
AWS_S3_BUCKET="sanskriti-major-project"

# Google Gemini AI
GOOGLE_GEMINI_API_KEY="..."
GOOGLE_GEMINI_MODEL_NAME="gemini-2.5-flash"
GEMINI_MODEL_NAME="gemini-2.5-flash"

# OCR Service
OCR_SERVICE_URL="http://localhost:8001"

# Queue/Cron Auth
CRON_SECRET="..."
```

---

## 9. Running Locally

1. **Database service**: `docker compose up -d` (starts PostgreSQL)
2. **Install**: `npm install`
3. **Migrate**: `npx prisma migrate dev`
4. **Dev**: `npm run dev`

### Running the standalone OCR service
```bash
brew install poppler   # required by pdf2image for PDF OCR
cd ../ocr
pip install -r requirements.txt
python app.py  # serves on http://localhost:8001
```

### Google Cloud credentials for OCR
Export a credentials file path before starting the OCR server:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
```

---

## 10. API Routes Summary

| Method | Route | Purpose |
|--------|-------|---------|
| `*` | `/api/auth/[...nextauth]` | NextAuth handler |
| `GET` | `/api/feed?cursor=` | Paginated recommendation feed |
| `GET` | `/api/search?q=` | Search users + posts (privacy-aware) |
| `GET` | `/api/posts/[id]` | Single post detail |
| `GET` | `/api/posts/[id]/ocr-status` | Poll OCR + translation status |
| `GET` | `/api/cron/process-queue` | Queue worker endpoint (Bearer protected) |
| `GET` | `/api/dev/trigger-queue` | Manual queue trigger in development |
| `POST` | `/api/internal/ocr-pipeline` | Legacy/debug route (not used by queue flow) |
| `POST` | `/api/internal/audio-pipeline` | Legacy/debug route |
| `POST` | `/api/internal/video-pipeline` | Legacy/debug route |
| `POST` | `/api/upload/complete` | Upload completion handler |
| `GET` | `/offline` | PWA offline fallback page |
| `GET` | `/manifest.json` | PWA manifest |
| `GET` | `/sw.js` | Service worker script |

---

## 11. Server Actions Summary

| Action | File | Purpose |
|--------|------|---------|
| `signUp` | `actions/auth.ts` | Register with credentials |
| `signInWithCredentials` | `actions/auth.ts` | Login with email/password |
| `signInWithProvider` | `actions/auth.ts` | OAuth login |
| `initiateUpload` | `actions/upload.ts` | Create post + presigned S3 URLs |
| `finalizeUpload` | `actions/upload.ts` | Create OCR stub + enqueue background job |
| `updatePostDetails` | `actions/post.ts` | Edit post title/caption/tags/visibility |
| `deletePost` | `actions/post.ts` | Delete post and related queue/media data |
| `updateProfileSettings` | `actions/settings.ts` | Update username and profile privacy |
| `toggleLike` | `actions/social.ts` | Like/unlike a post |
| `addComment` | `actions/social.ts` | Add comment (supports threading) |
| `toggleBookmark` | `actions/social.ts` | Bookmark/unbookmark a post |
| `toggleFollow` | `actions/social.ts` | Follow/unfollow a user |
| `fetchFeed` | `actions/feed.ts` | Cursor-paginated feed fetch |
| `requestTranslation` | `actions/translation.ts` | Gemini Hindi+English (cached) |

---

## 12. Docker Services

```yaml
services:
  db:              # PostgreSQL 16 Alpine — port 5432
```

OCR now runs as a standalone service from `../ocr/app.py` (port 8001), not as a Docker service.

---

## 13. PWA Configuration

### Manifest (`public/manifest.json`)
- **Name**: Sanskriti
- **Theme Color**: `#C9A96E` (accent gold)
- **Background Color**: `#0F0E0C` (dark background)
- **Display**: Standalone
- **Icons**: 192×192 and 512×512 PNG (maskable)
- **Shortcuts**: Capture, Record, Upload (with custom icons)

### Service Worker (`public/sw.js`)
- **Cache Strategy**: Network-first for API routes, cache-first for static assets
- **Offline Fallback**: `/offline` page
- **Cache Name**: `sanskriti-v1` (increment on updates)

### Registration
- `PwaRegister` component in root layout registers service worker on mount
- Works in all modern browsers (Chrome, Edge, Safari, Firefox)

### Mobile Support
- Safe area insets for iOS notch/home indicator
- Camera/recording controls respect `env(safe-area-inset-bottom)`
- Portrait orientation lock for capture/record flows

---

## 14. New Dependencies

| Package | Purpose |
|---------|---------|
| `jspdf` | Client-side PDF generation from captured photos (multiple pages → single PDF) |
| `browser-image-compression` | Compress camera captures before upload (max 2MB, 1920px) |
| `@types/dom-mediacapture-record` | TypeScript types for MediaRecorder API |

---

## 15. Routes Summary

### Protected Routes (require authentication)
- `/feed` - Recommendation feed
- `/capture` - Camera capture (single/multiple photos → PDF)
- `/record` - Audio/video recording
- `/upload` - Traditional file upload (supports PDFs)
- `/saved` - Saved/Liked collections with media filters
- `/settings` - Username, privacy, and theme settings
- `/profile` - User profile pages
- `/dashboard` - User settings
- `/post/[id]` - Post detail view

### Public Routes
- `/` - Landing page (auto-redirects to `/feed` if already authenticated)
- `/login` - Login form + OAuth
- `/register` - Registration form
- `/offline` - PWA offline fallback

All protected routes redirect to `/login` if unauthenticated. Authenticated users are redirected from `/login` and `/register` to `/feed`.
