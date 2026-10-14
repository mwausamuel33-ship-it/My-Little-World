# My-Little-World
# 🌷 My Little World

### Your little space to write, create, grow, and remember.

**My Little World** is a personalised digital journaling and personal growth application designed to bring the warmth of a physical journal into a flexible digital experience.

It combines journaling, digital scrapbooking, drawing, habit tracking, personal development, faith journaling, and planning in one private, customisable space.

The goal is to create an application that feels personal, creative, and enjoyable to use every day — a place where users can preserve memories, express themselves, build meaningful habits, and reflect on their growth.

> *A little space for your thoughts, your memories, your faith, and the person you're becoming.* 🌱

---

## ✨ Vision

My Little World aims to combine the creative freedom of a physical scrapbook with the convenience of a modern productivity application.

Users should be able to customise their space, write freely, decorate pages, track personal goals, nurture a virtual companion, and access their journals across devices.

The application is being designed with **offline-first functionality, privacy, reliability, and personalisation** at its core.

## 🎨 Planned Features

### 📖 Personalised Journaling
- Create and organise multiple journals.
- Write daily entries, reflections, memories, and quick notes.
- Customise page colours, backgrounds, fonts, and layouts.
- Use lined, dotted, grid, blank, and decorative paper.
- Add titles, dates, tags, and mood labels.
- Search, favourite, and revisit previous entries.

### 🖼️ Digital Scrapbooking
- Add photographs, text, stickers, and decorative elements.
- Move, resize, rotate, duplicate, and layer page elements.
- Create reusable page layouts and templates.
- Preserve individual elements as editable content rather than flattening entire pages into images.
- Build personalised scrapbook pages for memories and milestones.

### ✍🏽 Writing & Drawing Studio
- Dedicated writing and free-drawing spaces.
- Adjustable drawing colours, brush sizes, and opacity.
- Pencil, pen, brush, highlighter, and eraser tools.
- Undo, redo, zoom, and pan.
- Support for finger drawing and compatible styluses.
- Save sketches and incorporate them into journal pages.

### 🌱 Habits, Goals & Growth Companion
- Create custom habits, routines, and checklists.
- Track daily, weekly, and custom-schedule goals.
- Monitor streaks, milestones, and achievements.
- Nurture a virtual companion that develops through consistent progress.
- Earn growth points and unlock companion stages and decorations.
- Encourage returning after breaks without deleting personal progress.

**Monthly streak restore system:**
- Three streak restores are available per calendar month.
- Missing a journaling day can break the streak and cause the companion to die.
- A restore revives the companion and preserves the previous streak.
- Restore allowances renew monthly, and unused restores do not roll over.
- Journal entries and memories remain safe even when a streak resets.

### 🙏🏽 Faith & Bible Journal
- Bible study notes and personal reflections.
- Saved verses with highlights and annotations.
- Prayer lists and prayer updates.
- Gratitude journaling.
- Reusable prayer and Bible study templates.
- Organised collections of verses and faith-related topics.

### 🌸 Personal Growth
- Daily reflections and mood tracking.
- Gratitude, affirmations, and lessons learned.
- Fitness, self-care, and personal goals.
- 30-day and 90-day challenges.
- Weekly and monthly reviews.
- Progress tracking and personal milestones.

### 🗓️ Planning & Organisation
- Calendar with journal entries and important dates.
- Customisable routines and checklists.
- Morning, evening, weekly, and monthly templates.
- Editable categories, sections, and goals.
- Optional reminders and notifications.

### ☁️ Offline-First & Cross-Device Access
- Access previously saved content without an internet connection.
- Save changes locally while offline.
- Automatically synchronise pending changes when connectivity returns.
- Support Android phones, tablets, and desktop computers.
- Display local-save and synchronisation status.
- Reconcile changes safely across multiple devices.
- Export and back up journal content and media.

### 🔐 Privacy & Data Ownership
- Individual user accounts and authentication.
- Private journals and media by default.
- User-specific database access controls.
- Secure data transmission and storage.
- Export and account deletion functionality.
- Clear handling of locally stored and cloud-synchronised data.

---

## 🛠️ Proposed Technology Stack

The stack is planned around the application's offline requirements, editable canvas, cross-device experience, and maintainability.

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type safety and maintainable code |
| Vite | Development server and build tooling |
| Tailwind CSS | Responsive styling and theming |
| Supabase Auth | User registration and authentication |
| Supabase PostgreSQL | Cloud database |
| Supabase Storage | Private media storage |
| IndexedDB | Local offline data persistence |
| Dexie.js | IndexedDB management |
| React Konva | Interactive scrapbook canvas |
| Service Workers | Offline application support |
| Progressive Web App (PWA) | Installable cross-device experience |
| Git & GitHub | Version control and collaboration |

The final architecture may evolve as implementation and testing reveal the best solutions for offline synchronisation, drawing performance, and data consistency.

---

## 🏗️ Development Roadmap

Development will take place in stages, prioritising a reliable foundation before advanced features.

- [ ] **Phase 1 — Foundation**
  - [ ] Repository and project setup
  - [ ] Responsive layout and navigation
  - [ ] User registration and authentication
  - [ ] Database schema and access policies
  - [ ] Local data persistence

- [ ] **Phase 2 — Journaling**
  - [ ] Create, edit, and delete journal entries
  - [ ] Journal organisation and categories
  - [ ] Themes, page styles, and templates
  - [ ] Calendar, search, tags, and favourites

- [ ] **Phase 3 — Scrapbook & Creative Studio**
  - [ ] Editable canvas and page elements
  - [ ] Photo uploads and positioning
  - [ ] Stickers, decorations, and layering
  - [ ] Drawing tools and sketch management
  - [ ] Undo and redo

- [ ] **Phase 4 — Habits & Personal Growth**
  - [ ] Habit tracking and routines
  - [ ] Goals, progress, and achievements
  - [ ] Companion growth system
  - [ ] Monthly streak restores
  - [ ] Faith journal and growth templates

- [ ] **Phase 5 — Offline & Synchronisation**
  - [ ] Offline access and queued changes
  - [ ] Automatic synchronisation
  - [ ] Conflict detection and recovery
  - [ ] Cross-device media synchronisation
  - [ ] Backup and export

- [ ] **Phase 6 — Testing & Release**
  - [ ] Responsive and accessibility testing
  - [ ] Authentication and privacy testing
  - [ ] Offline and multi-device testing
  - [ ] Performance improvements
  - [ ] Deployment and documentation

*Checklist items represent planned work. They will be marked complete as the corresponding features are implemented and tested.*

---

## 💻 Getting Started

### Prerequisites

Install the following before setting up the project:

- [Node.js](https://nodejs.org/) — an active LTS release
- npm, included with Node.js
- [Git](https://git-scm.com/)
- A Supabase account when cloud authentication and synchronisation are introduced

### Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd my-little-world
```

Install dependencies after the application scaffold has been created:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

> **Development status:** The application is currently in the planning and initial setup stage. These commands assume a Vite-based project scaffold has been created; the application is not yet a completed, runnable product.

### Environment Variables

When Supabase integration is added, create a local `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Use the publishable key intended for frontend applications and configure appropriate database and storage policies. **Never expose a Supabase secret key, service-role key, or other privileged credentials in frontend code or commit them to GitHub.**

Add environment files containing secrets to `.gitignore`.

---

## 🔒 Privacy & Security Principles

Because journals may contain sensitive personal reflections, photographs, and prayer notes, privacy is a fundamental design requirement.

- Users must only access their own private records.
- Database and storage access must be enforced through server-side policies.
- Offline changes must be preserved until they can be synchronised safely.
- Conflicting edits must not silently overwrite journal content.
- Account deletion and data export must be supported.
- Cloud backups and local storage must be handled deliberately.
- Authentication must never be treated as a substitute for authorisation.

Offline access does not automatically provide end-to-end encryption. Any future end-to-end encryption feature will require a dedicated security design.

---

## 🎨 Design Philosophy

My Little World is intended to feel like a personal sanctuary rather than a rigid productivity dashboard.

The visual direction combines:

- Soft pastel and botanical themes.
- Warm cream-paper textures.
- Elegant and handwritten-style typography.
- Personalised colours and seasonal appearances.
- Stickers, washi tape, stamps, and scrapbook decorations.
- Clean navigation with responsive layouts.
- Optional dark mode.

Personalisation should remain flexible so that every user can create a space that reflects their own personality.

---

## 🧭 Project Principles

1. **Privacy first** — personal content belongs to its user.
2. **Offline first** — the core journaling experience should remain useful without internet access.
3. **Reliability over feature count** — dependable saving and synchronisation come before advanced extras.
4. **Editable by design** — scrapbook pages must preserve their individual elements.
5. **Personalisation matters** — users should be free to organise and decorate their space.
6. **Growth without guilt** — progress systems should encourage consistency and make returning after a break possible.
7. **Build incrementally** — every phase should produce a testable improvement.

---

## 🚀 Long-Term Vision

My Little World begins as a personalised journaling experience and is being architected to support multiple users.

Future possibilities include:

- Additional companion species and customisable gardens.
- More advanced drawing and calligraphy tools.
- Expanded templates and seasonal themes.
- Richer personal growth insights.
- Improved backup and recovery options.
- Additional customisation and accessibility features.

These possibilities will be considered after the core application is reliable.

---

## 📄 License

A license has not yet been selected. Licensing terms will be added before the project is distributed publicly.

---

**My Little World** 🌷

*Write your story. Keep your memories. Grow at your own pace.*
