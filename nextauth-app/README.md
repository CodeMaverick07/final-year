# Sanskriti — Manuscript Sharing & Digitization Platform

A social media platform for manuscript sharing and digitization, built on Next.js 14 (App Router) with PostgreSQL, Prisma, NextAuth.js v5, and AWS S3.

## Features

- **Multi-provider auth** — Google OAuth, GitHub OAuth, email/password credentials
- **Manuscript upload** — Drag-and-drop file upload to AWS S3 with presigned URLs (images, audio, video)
- **Social interactions** — Like, comment (threaded), bookmark, follow/unfollow
- **Personalized feed** — Scored recommendation algorithm based on follows, shared tags, recency, and popularity
- **User profiles** — Post grid, media-type tabs, follower/following lists
- **Optimistic UI** — Instant feedback using `useOptimistic` for likes, bookmarks, and follows
- **Editorial dark theme** — Premium dark UI with Playfair Display + DM Sans fonts

## Tech Stack

| Layer          | Technology              |
| -------------- | ----------------------- |
| Framework      | Next.js 14 (App Router) |
| Language       | TypeScript              |
| Database       | PostgreSQL 16           |
| ORM            | Prisma                  |
| Authentication | NextAuth.js v5 (Auth.js)|
| Storage        | AWS S3                  |
| Styling        | Tailwind CSS            |
| UI Libraries   | Radix UI, Embla Carousel, react-dropzone |
| Containerization | Docker Compose        |

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd nextauth-app
npm install
```

### 2. Start the database

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable              | Description                    |
| --------------------- | ------------------------------ |
| `DATABASE_URL`        | PostgreSQL connection string   |
| `AUTH_SECRET`         | NextAuth.js secret key         |
| `NEXTAUTH_URL`        | Application URL (http://localhost:3000) |
| `GOOGLE_CLIENT_ID`    | Google OAuth client ID         |
| `GOOGLE_CLIENT_SECRET`| Google OAuth client secret     |
| `GITHUB_CLIENT_ID`    | GitHub OAuth client ID         |
| `GITHUB_CLIENT_SECRET`| GitHub OAuth client secret     |
| `AWS_ACCESS_KEY_ID`   | AWS access key                 |
| `AWS_SECRET_ACCESS_KEY`| AWS secret access key         |
| `AWS_REGION`          | AWS region (e.g., us-east-1)   |
| `AWS_S3_BUCKET`       | S3 bucket name                 |

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Routes

| Path                 | Description                        | Access     |
| -------------------- | ---------------------------------- | ---------- |
| `/`                  | Landing page                       | Public     |
| `/login`             | Login page                         | Public     |
| `/register`          | Registration page                  | Public     |
| `/feed`              | Personalized recommendation feed   | Protected  |
| `/upload`            | Multi-step manuscript upload       | Protected  |
| `/profile`           | Own profile redirect               | Protected  |
| `/profile/[username]`| User profile page                  | Protected  |
| `/post/[id]`         | Post detail with comments          | Protected  |
| `/dashboard`         | Session info dashboard             | Protected  |

## Available Scripts

| Command                         | Description                 |
| -------------------------------- | --------------------------- |
| `npm run dev`                   | Start development server    |
| `npm run build`                 | Build for production        |
| `npm start`                     | Start production server     |
| `npx prisma migrate dev`       | Run database migrations     |
| `npx prisma studio`            | Open Prisma Studio GUI      |
| `docker compose up -d`         | Start PostgreSQL container  |
| `docker compose down`          | Stop PostgreSQL container   |
