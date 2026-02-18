# Project Context: Sanskriti — Manuscript Sharing & Digitization Platform

This file contains comprehensive information about the project structure, technology stack, database design, OCR pipeline, and key workflows. It is intended to provide immediate context for an LLM or developer to understand and extend the application.

---

## 1. Project Overview

**Name**: Sanskriti (built on NextAuth App / AuthKit)
**Goal**: A social media platform for manuscript sharing and digitization. Users upload manuscripts (images, audio recordings, video clips), tag them, interact via likes/comments/bookmarks, follow each other, and discover work through a personalized recommendation feed. The platform also provides automatic OCR (Google Vision), AI-powered text reconstruction (Gemini), and bilingual translation (Hindi + English).

**Core Features**:
- Multi-provider authentication (Google, GitHub, Credentials) via NextAuth.js v5.
- Manuscript upload to AWS S3 (presigned URLs, multi-file per post).
- Automatic OCR/Extraction pipeline:
  - **Images**: Google Vision text detection → Gemini AI reconstruction.
  - **Audio**: Gemini multimodal transcription → Gemini AI reconstruction.
  - **Video**: Google Video Intelligence API (Text + Speech) → Gemini AI reconstruction.
- Bilingual translation: Hindi + English in a single Gemini API call, cached per post.
- Social interactions: Like, Comment (threaded), Bookmark, Follow/Unfollow.
- Personalized recommendation feed with scored ranking algorithm.
- Editorial dark UI theme with Playfair Display + DM Sans fonts.
- User profiles with posts grid, media-type filtered tabs, follower/following lists.
- **Navigation**: Dedicated Sidebar for authenticated users, hiding global Navbar on protected routes.
- **State Synchronization**: `FeedClient` uses a `useEffect` synchronization pattern to ensure that server-side `revalidatePath` calls update the client-side infinite scroll state.


---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14.2.x (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS (editorial dark theme) |
| **Database** | PostgreSQL 16 (Docker Compose) |
| **ORM** | Prisma v6.x |
| **Authentication** | NextAuth.js v5 (Beta) / Auth.js |
| **Storage** | AWS S3 (presigned upload URLs) |
| **Storage** | AWS S3 (presigned upload URLs) |
| **OCR / Extraction** | Google Cloud Vision (Images) + Video Intelligence (Video) |
| **AI / LLM** | Google Gemini (via `@google/generative-ai`) |
| **UI Libraries** | Radix UI (Dialog, Tabs, Toggle), Embla Carousel, react-dropzone |
| **Utilities** | nanoid, date-fns, zod, react-hot-toast, bcryptjs |
| **Fonts** | Playfair Display (headings), DM Sans (body) via next/font/google |

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
│   │   ├── social.ts           # Server Actions: toggleLike, addComment, toggleBookmark, toggleFollow
│   │   ├── feed.ts             # Server Action: fetchFeed (cursor-paginated)
│   │   └── translation.ts     # Server Action: requestTranslation (Gemini Hindi+English, cached)
│   ├── api/
    │   ├── auth/[...nextauth]/route.ts   # NextAuth API Handler
    │   ├── feed/route.ts                 # GET /api/feed?cursor= (paginated feed)
    │   ├── internal/ocr-pipeline/route.ts # POST — internal Image OCR orchestration
    │   ├── internal/audio-pipeline/route.ts # POST — internal Audio transcription
    │   ├── internal/video-pipeline/route.ts # POST — internal Video extraction
 │   │   ├── posts/[id]/route.ts           # GET /api/posts/:id (single post)
│   │   ├── posts/[id]/ocr-status/route.ts # GET — OCR/translation status polling
│   │   └── upload/complete/route.ts      # POST /api/upload/complete
│   ├── (protected)/            # NEW: Authenticated Route Group
│   │   ├── layout.tsx          # Layout with <Sidebar />
│   │   ├── dashboard/page.tsx  # User session info
│   │   ├── feed/
│   │   │   ├── page.tsx        # Recommendation feed (server component)
│   │   │   └── FeedClient.tsx  # Client — infinite scroll
│   │   ├── upload/page.tsx     # Multi-step upload form
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
│   ├── Sidebar.tsx                # NEW: Vertical navigation for auth users
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
│   └── SignOutButton.tsx          # Client sign-out button
├── lib/
│   ├── prisma.ts               # Prisma Client Singleton
│    ├── s3.ts                   # S3 Client + presigned URL helpers
    ├── feed.ts                 # Recommendation query (scored ranking + ocrStatus)
    ├── gemini.ts               # Gemini API: Reconstruction + Translation + Audio Transcription
    └── videointelligence.ts    # Google Video Intelligence API client
├── ocr-service/                # Dockerized FastAPI OCR microservice
│   ├── Dockerfile              # Python 3.11-slim, uvicorn
│   ├── main.py                 # FastAPI endpoint: POST /ocr (Google Vision)
│   └── requirements.txt        # fastapi, uvicorn, python-multipart, google-cloud-vision
├── prisma/
│   ├── schema.prisma           # Full social media + OCR schema (see §5)
│   └── migrations/             # 3 migration folders
├── auth.config.ts              # Edge-compatible Auth config
├── auth.ts                     # Full Auth config with Prisma Adapter
├── middleware.ts               # Route protection
├── docker-compose.yml          # PostgreSQL 16 + OCR service containers
├── tailwind.config.ts           # Editorial dark palette + animations
├── package.json                # Next.js 14.2.35, all dependencies
└── .env.local                  # Environment variables (see §8)
```

### 3b. `ocr/` — Standalone OCR Development Script

```
ocr/
├── app.py              # Standalone FastAPI OCR server (Google Vision)
├── requirements.txt    # fastapi, uvicorn, python-multipart, google-cloud-vision
├── image.png           # Test manuscript image
└── venv/               # Python virtual environment
```

This is the original development OCR script that was later integrated into `nextauth-app/ocr-service/`. It can run independently for testing: `cd ocr && python app.py` (serves on port 8001).

---

## 4. Authentication Architecture (NextAuth v5)

Split into two files for Edge Runtime compatibility:

1.  **`auth.config.ts` (Edge Compatible)**: Contains providers (stub Credentials), page config, `authorized` callback. Protects `/dashboard`, `/upload`, `/feed`, `/profile`. Redirects logged-in users from auth pages to `/feed`.

2.  **`auth.ts` (Node.js Only)**: Imports `authConfig`, adds PrismaAdapter, full Credentials provider with `prisma.user.findUnique` and `bcrypt.compare`. Exports `auth`, `signIn`, `signOut`, `handlers`.

---

## 5. Database Schema (Prisma)

### NextAuth Models
- **User**: `id`, `name`, `email`, `emailVerified`, `image`, `password` (nullable), `bio`, `username` (unique), + relations
- **Account**: OAuth provider details
- **Session**: Database sessions
- **VerificationToken**: Email verification

### Social Models
- **Post**: `title`, `subtitle`, `description`, `isPublic`, `authorId` → media, likes, comments, bookmarks, tags, manuscriptOcr
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

---

## 6. Key Workflows

### Upload Flow
1. User fills metadata (title, subtitle, description, tags, visibility) on Step 1
2. User drops files on Step 2 (images/audio/video via react-dropzone)
3. Client calls `initiateUpload` server action → creates Post + Media stubs + presigned S3 URLs
4. Client uploads files directly to S3 via XHR PUT with progress tracking
5. Client calls `finalizeUpload` → creates `ManuscriptOCR` stub → fires async OCR pipeline
6. Redirects to `/post/[id]` where user sees real-time OCR progress

### OCR/Extraction Pipeline (Async, Fire-and-Forget)

**1. Routing (in `finalizeUpload`)**:
- **Images** → `/api/internal/ocr-pipeline`
- **Audio** → `/api/internal/audio-pipeline`
- **Video** → `/api/internal/video-pipeline`

**2. Formatting**:
- **Image Pipeline**: Fetches images → Google Vision (via FastAPI) → Raw Text
- **Audio Pipeline**: Fetches audio → Gemini Multimodal Transcription → Raw Text
- **Video Pipeline**: Google Video Intelligence (Text + Speech) → Merged Raw Text

**3. Reconstruction (Common)**:
- Raw text saved to DB → status `RECONSTRUCTING`
- Gemini `runGeminiReconstruction()` cleans and fills gaps → `reconstructedText` saved → status `DONE`
- On any error → status `FAILED` with error message saved

### Translation Flow (On-Demand, Cached)
1. Post detail page shows "🌐 Translate Manuscript" button (only when OCR is `DONE`)
2. User clicks → `requestTranslation()` server action
3. Guard: if already `DONE` → returns cached `hindi` + `english` immediately
4. Guard: if `PROCESSING` → returns "already in progress"
5. Otherwise: single Gemini `runGeminiTranslation()` call → returns `{ hindi, english }` JSON
6. Both translations saved to DB → never re-fetched

### Feed Algorithm
Scored ranking (computed server-side):
- +10 if post is from someone user follows
- +3 if post shares tags with user's liked posts
- +2 if post created within last 7 days
- +1 if post has >10 likes
- -100 if already liked by user (hide seen)
- -100 if by current user (hide own)
Sorted by score DESC, createdAt DESC. Paginated with cursor.

### Optimistic UI
Uses `useOptimistic` (React 19) for instant feedback. **Implementation Rule**: All optimistic updates (`addOptimistic`) must be wrapped within a `startTransition` block to avoid React warnings and ensure proper state reconciliation.
- Like: toggle heart + count
- Follow: toggle button label
- Bookmark: toggle fill
- Comment: append immediately

---

## 7. Design System

**Theme**: Editorial dark — archival print meets modern digital

| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#0F0E0C` | Near-black warm background |
| `surface` | `#1A1916` | Card/panel backgrounds |
| `border` | `#2E2C28` | Subtle dividers |
| `accent` | `#C9A96E` | Antique gold buttons/highlights |
| `text-primary` | `#F0EBE1` | Main text |
| `text-muted` | `#7A7570` | Secondary/helper text |
| `like-red` | `#D4574A` | Like hearts |

**Fonts**: Playfair Display (headings), DM Sans (body)
**Animations**: Fade-in stagger on feed cards, pulse on like, animated dash border on dropzone, sliding tab indicator, pulse dot on OCR status banner, spinner on translate button.

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
```

---

## 9. Running Locally

1. **Docker services**: `docker compose up -d` (starts PostgreSQL + OCR service)
2. **Install**: `npm install`
3. **Migrate**: `npx prisma migrate dev`
4. **Dev**: `npm run dev`

### Running the standalone OCR script (outside Docker)
```bash
cd ../ocr
pip install -r requirements.txt
python app.py  # serves on http://localhost:8001
```

### Google Cloud credentials for OCR
Place your service account JSON at `ocr-service/credentials.json` (mounted read-only into Docker container).

---

## 10. API Routes Summary

| Method | Route | Purpose |
|--------|-------|---------|
| `*` | `/api/auth/[...nextauth]` | NextAuth handler |
| `GET` | `/api/feed?cursor=` | Paginated recommendation feed |
| `GET` | `/api/posts/[id]` | Single post detail |
| `GET` | `/api/posts/[id]/ocr-status` | Poll OCR + translation status |
| `GET` | `/api/posts/[id]/ocr-status` | Poll OCR + translation status |
| `POST` | `/api/internal/ocr-pipeline` | Internal: run Image OCR (secret-protected) |
| `POST` | `/api/internal/audio-pipeline` | Internal: run Audio Transcription (secret-protected) |
| `POST` | `/api/internal/video-pipeline` | Internal: run Video Extraction (secret-protected) |
| `POST` | `/api/upload/complete` | Upload completion handler |

---

## 11. Server Actions Summary

| Action | File | Purpose |
|--------|------|---------|
| `signUp` | `actions/auth.ts` | Register with credentials |
| `signInWithCredentials` | `actions/auth.ts` | Login with email/password |
| `signInWithProvider` | `actions/auth.ts` | OAuth login |
| `initiateUpload` | `actions/upload.ts` | Create post + presigned S3 URLs |
| `finalizeUpload` | `actions/upload.ts` | Create OCR stub + trigger pipeline |
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
  ocr-service:     # FastAPI + Google Vision — port 8001
```

Both managed via `docker-compose.yml` in the project root.
