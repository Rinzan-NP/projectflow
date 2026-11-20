# ProjectFlow — Modern Project Management App

A fast, clean web application for managing software projects, custom workflow stages, tasks, bugs, and feature roadmaps in the style of Linear and Jira.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Lucide Icons + next-themes
- **Backend**: Next.js API Routes / Server Handlers with Zod validation
- **Database**: SQLite with Prisma ORM (`prisma/schema.prisma`)
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Command Palette**: `Cmd/Ctrl+K` global search & quick jump

---

## Quick Start (Run Locally)

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/22/26)
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database & Seed Demo Data
The app uses an embedded SQLite database (`prisma/dev.db`), requiring zero external database configuration:
```bash
# Push Prisma schema to SQLite
npx prisma db push

# Load rich demo data (2 projects, 30 items, stages, checklists, comments)
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Docker Deployment

A production-ready, multi-stage `Dockerfile` with standalone Next.js bundling and a `docker-compose.yml` file with persistent volume storage for SQLite are included.

### Option A: Running with Docker Compose (Recommended)
```bash
# Build and run container with persistent volume
docker compose up -d --build
```
- App will be running at [http://localhost:3000](http://localhost:3000)
- The database is stored in a named Docker volume (`projectflow_data`), preserving all your data across container updates and restarts.
- To seed initial demo data on startup, set `SEED_DB=true` in `docker-compose.yml`.

### Option B: Building and Running the Docker Image Manually
```bash
# 1. Build the image
docker build -t projectflow:latest .

# 2. Run container with a local data directory for persistent SQLite storage
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name projectflow \
  projectflow:latest
```

---

## Core Features & Screens

### 1. Projects Dashboard (`/projects`)
- Grid of all software projects with live progress bars (% items in done stages).
- Metrics for Open Bugs, Open Features, and Overdue items.
- Create new projects (with auto-generated short keys like `CRM`, `APP`).
- Edit project settings, archive, or delete.
- Filter by status: Active, On Hold, Completed, Archived.

### 2. Kanban Board (`/projects/[KEY]/board`)
- Dynamic columns for custom project stages in order.
- Instant drag-and-drop between stages and reordering with `@dnd-kit`.
- Quick-add card at the bottom of each column (type + title + Enter).
- Column headers show item counts and turn red when WIP limits are exceeded.
- Filter bar: text search, priority, assignee, "Bugs only", "Features only", "My items".

### 3. List / Table View (`/projects/[KEY]/list`)
- Sortable, filterable table view across ID, title, stage, priority, assignee, due date, and updated date.
- Floating bulk action bar when items are selected (bulk change stage, assignee, priority, or delete).

### 4. Item Detail View (`/projects/[KEY]/items/[ID]`)
- Opens as a rich modal from the board and list, or as a standalone URL.
- Live inline edits for title, description (Markdown supported), assignee, priority, due date, estimate.
- **Type-specific fields**:
  - **Bugs**: Severity (Blocker, Major, Minor, Trivial), Steps to Reproduce, Expected vs Actual Result, Environment, Source (Internal vs Client Reported).
  - **Features**: User Story / Problem Statement, Requested By stakeholder/client.
- Subtasks breakdown with stage progress.
- Interactive acceptance criteria / checklists with real-time completion toggles.
- Markdown comments thread and activity history log.

### 5. Custom Stage Management (`/projects/[KEY]/settings`)
- Add new stages, rename, recolor, set WIP limits, and designate completion stages (`isDoneStage`).
- Reorder stages up and down.
- **Safe stage deletion**: Prompts to choose which stage to migrate existing items to.

### 6. Bug Tracker View (`/projects/[KEY]/bugs`)
- Groups bugs by severity: Blocker, Major, Minor, Trivial.
- Quick "Report Bug" modal capturing reproduction steps and environment.
- Filter by Client-Reported vs Internal.

### 7. Feature Roadmap (`/projects/[KEY]/roadmap`)
- Visual roadmap organizing features across workflow stages.
- Displays user stories, requested by client tags, and child task progress.
- "Propose Feature" form.

### 8. My Work (`/my-work`)
- Centralized cross-project dashboard for all items assigned to the user.
- Grouped into: Overdue, Due Today, Due This Week, Later, and Completed.

### 9. Global Command Palette & Shortcuts
- `Cmd+K` or `Ctrl+K`: Jump to any project or item, or trigger quick actions.
- `C`: Open quick "Create Item" modal anywhere.
- `/`: Focus search.
- Dark / Light mode toggle.
