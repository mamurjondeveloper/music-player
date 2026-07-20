# 🎵 Symphony — Premium Private Music Streaming Player

<p align="left">
  <img alt="Build Android APK" src="https://github.com/mamurjondeveloper/music-player/actions/workflows/build-apk.yml/badge.svg" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs" />
  <img alt="Expo" src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript" />
</p>

Symphony is a modern, lightweight, and premium private music player designed for personal use and sharing with close friends. It ships as **three coordinated apps** — a Next.js web client, a NestJS API, and a native Android/iOS app built with Expo — sharing one SQLite-backed library. It features a stunning, dark-by-default glassmorphic interface inspired by Spotify and Apple Music, with no heavy container orchestration (Docker/Redis) required.

## 📋 Contents

- [System Architecture](#️-system-architecture)
- [Tech Stack](#-tech-stack)
- [Premium Features](#-premium-features)
- [Getting Started (Web)](#-getting-started)
- [Mobile App](#-mobile-app)
- [Keyboard Shortcuts](#-keyboard-shortcuts-cheatsheet)

---

## 🏗️ System Architecture

The following diagram illustrates how the web client, mobile app, and CI pipeline all interact with the single NestJS API and SQLite database:

```mermaid
graph TD
    %% Styling
    classDef default fill:#121216,stroke:#22c55e,stroke-width:1px,color:#fff;
    classDef primary fill:#1c3d27,stroke:#22c55e,stroke-width:2px,color:#fff;
    classDef database fill:#1a1a24,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef mobile fill:#1a2332,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef ci fill:#2a1f0d,stroke:#f59e0b,stroke-width:2px,color:#fff;

    Client[Next.js Client App<br/>Port 3000]:::primary -->|REST / API calls| API[NestJS Backend API<br/>Port 4000]:::primary
    Client -->|Play Audio / Load Art| Static[Express Static Router<br/>/uploads]

    Mobile[Expo Mobile App<br/>Android / iOS]:::mobile -->|REST / API calls<br/>Bearer JWT| API
    Mobile -->|Cache songs locally| Cache[(On-device Cache<br/>expo-file-system)]:::mobile

    API -->|Queries & Updates| DB[(SQLite Database<br/>dev.db)]:::database
    API -->|Read/Write Media| FS[Local Filesystem<br/>uploads/songs/<br/>uploads/covers/]

    GHA[GitHub Actions<br/>build-apk.yml]:::ci -->|expo prebuild + gradlew| APK[Signed Release APK]:::ci
    GHA -.->|triggered on push to main| Mobile
```

---

## ⚡ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | Next.js 15 (App Router), TypeScript | Fast SSR/CSR and Type-safe Routing |
| **Styling** | Tailwind CSS v4, Framer Motion | Smooth, glassmorphism UI & Micro-animations |
| **State Management** | Zustand | Highly optimized, fast global audio engine states |
| **Backend Core** | NestJS, Express | Modular, scalable, and secure REST API |
| **Database ORM** | Prisma ORM | Swift, type-safe SQLite database query building |
| **Audio Processing** | music-metadata (Node-native) | Extracts tags (ID3) and album art on upload |

---

## ✨ Premium Features

*   **🔒 Private Access**: Only manual user accounts added to the SQLite database can log in. No public sign-up page.
*   **📂 Easy Uploads**: Drag and drop audio files (MP3, WAV, FLAC). The backend automatically extracts titles, artists, album names, durations, and embedded cover art photos.
*   **📱 Responsive Mobile Layout**: Displays a bottom navigation bar and a sleek mini-player that transitions into a full-screen player.
*   **🔀 Zustand Audio Engine**: Fully reactive player state manager controlling: Play, Pause, Previous, Next, Shuffle, Loop (None/One/All), Seek, Volume, and playback speed.
*   **🔄 Refresh Persistence**: Continues playing the active track, queue context, seek time, and volume level even after a page refresh.
*   **🎹 Keyboard Shortcuts**: Global control shortcuts bind play, skip, shuffle, loop, and volume adjustment (automatically ignored when typing in inputs).
*   **❤️ Liked Songs**: High-fidelity heart buttons with optimistic UI status updates.
*   **📜 Listening History**: Keeps records of recently played songs.
*   **🗂️ Drag & Drop Playlists**: Reorder playlist tracks natively using HTML5 drag-and-drop lists that sync directly with the backend database.
*   **📡 Media Session API**: Background playback support, lock screen controls, and hardware media keys synchronization.

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js**: Version 18.x or newer is recommended.
- **npm**: Installed automatically with Node.js.

### 📥 Project Setup
Follow these steps to configure your environment and run Symphony locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mamurjondeveloper/music-player.git
   cd music-player
   ```

2. **Initialize Backend Configurations**:
   Create `backend/.env` (this file is git-ignored — never commit real secrets) with:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="<generate a long random string, e.g. `openssl rand -hex 32`>"
   PORT=4000
   ```
   `JWT_SECRET` has no default fallback — the server refuses to start without it.

3. **Install Dependencies**:
   Open a terminal and install dependencies for both applications:
   ```bash
   # Install backend packages
   cd backend
   npm install
   
   # Run database migrations and seed the default user
   npx prisma migrate dev --name init
   
   # Install frontend packages
   cd ../frontend
   npm install
   ```

---

## 🔑 Accounts

The database migration seeds a default account you can use immediately:
- **Username**: `admin`
- **Password**: `password123`

Additional accounts (for friends/family) are created via the **Register** page/screen using a single-use invite code — any logged-in user can generate one for a friend (`POST /auth/invite-code`), there's no open public sign-up or admin-only static code.

---

## 🎮 Keyboard Shortcuts Cheatsheet

Use these global keys to control playback instantly without clicking:

| Key Binding | Action |
| :--- | :--- |
| **`Space`** | Play / Pause |
| **`Ctrl + ArrowRight`** | Play Next Track |
| **`Ctrl + ArrowLeft`** | Play Previous Track / Restart Song |
| **`Ctrl + ArrowUp`** | Increase Volume (+5%) |
| **`Ctrl + ArrowDown`** | Decrease Volume (-5%) |
| **`L`** | Toggle Loop Mode (None ➡️ Loop All ➡️ Loop One) |
| **`S`** | Toggle Shuffle Mode (On/Off) |

---

## 🏃 Running the Application

Open two terminal windows to run both services simultaneously:

### 1. Start the NestJS backend
```bash
cd backend
npm run start:dev
```
*Backend API starts listening at [http://localhost:4000](http://localhost:4000).*

### 2. Start the Next.js frontend
```bash
cd frontend
npm run dev
```
*Symphony client app starts listening at [http://localhost:3000](http://localhost:3000).*

---

## 📱 Mobile App

A native Android/iOS client lives in [`mobile/`](mobile/), built with **Expo SDK 57** and **React Native 0.86**. It talks to the same backend as the web client and adds a few mobile-only features:

```mermaid
graph LR
    Login[🔐 Login] --> Home[🏠 Home<br/>Recent • Trending • Playlists]
    Home --> Radio[📻 Radio<br/>Shuffle-play the full library]
    Home --> Import[⬆️ Import<br/>YouTube link → MP3]
    Home --> Player[🎧 Full-Screen Player<br/>Seek • Shuffle • Repeat]
    Player -.->|caches locally| Offline[(On-device MP3 cache)]
```

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Expo SDK 57, React Native 0.86 | Native Android/iOS from one codebase |
| **Audio Engine** | `expo-audio` | Streaming playback, background audio, lock-screen controls |
| **Auth Storage** | `expo-secure-store` | Encrypted on-device JWT storage |
| **Offline Cache** | `expo-file-system` (legacy API) | Caches played songs locally for instant replay |
| **Icons** | `lucide-react-native` | Consistent iconography with the web client |

### Building the APK

Every push to `main` triggers [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml), which runs `expo prebuild` + Gradle and uploads a signed release APK as a workflow artifact — no local Android Studio setup required. To build locally instead:

```bash
cd mobile
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The generated APK is at `mobile/android/app/build/outputs/apk/release/app-release.apk`.

> ⚠️ **Expo SDK moves fast.** Before adding new native modules, check [`mobile/AGENTS.md`](mobile/AGENTS.md) and the versioned docs at `docs.expo.dev/versions/v57.0.0/` — APIs like `expo-av` and the old `expo-file-system` string-path API have already been removed/replaced once in this project's history.
