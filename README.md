# 🎶 Refertoire

> **Ensemble Repertoire Syncing App** • by **RoddneilGemina**  
> *Designed to remove the hassle of forgetting specific pieces to learn or to keep track of.*  
> Built with Expo SDK 57, React Native, Expo Router, Mozilla PDF.js, Supabase, and TypeScript.

[![Deploy to GitHub Pages](https://github.com/refertoire/refertoire.github.io/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/refertoire/refertoire.github.io/actions/workflows/deploy-pages.yml)
[![Web Demo](https://img.shields.io/badge/Web_Demo-refertoire.github.io%2Fweb-blue?style=flat&logo=googlechrome)](https://refertoire.github.io/web/)
[![Download Android APK](https://img.shields.io/badge/Android_APK-refertoire.github.io%2Fapk-success?style=flat&logo=android)](https://refertoire.github.io/apk/Refertoire.apk)

---

### 🚀 Live Deployment & Download Links

| Destination | Path | Description |
| :--- | :--- | :--- |
| **🌐 Root Portal** | [https://refertoire.github.io/](https://refertoire.github.io/) | Landing page with live music staff animation, by RoddneilGemina |
| **💻 Web Application Demo** | [https://refertoire.github.io/web/](https://refertoire.github.io/web/) | Full interactive ensemble repertoire web app |
| **📱 Android APK Direct Download** | [https://refertoire.github.io/apk/Refertoire.apk](https://refertoire.github.io/apk/Refertoire.apk) | Direct binary download (~49 MB standalone APK) |
| **📦 Android APK Download Page** | [https://refertoire.github.io/apk/](https://refertoire.github.io/apk/) | Auto-download page with installation steps |

---

## 📖 Overview

**Refertoire** is an Ensemble Repertoire Syncing app designed to eliminate the friction of lost sheet music, scattered email threads, and outdated revisions for choral societies, chamber choirs, vocal ensembles, and church music programs.

Refertoire implements a **dual-architecture model tailored to the user's platform**:

1. **Android Mobile App (Standalone APK)**:
   - Stores scores internally in the app's sandboxed offline storage.
   - Designed for choristers singing in historic stone sanctuaries, cathedral balconies, and backstage spaces with zero Wi-Fi or cellular connectivity.
   - Includes a stage-ready sheet music reader with foot pedal turns and glare-free dark mode.

2. **Web App (Local Directory Sync Agent for PC & iOS)**:
   - Built for desktop PC/Mac users and iOS/iPadOS singers who cannot install APKs.
   - Functions as an **automated local file manager sync agent**: connects to a local folder on your computer (Dropbox, iCloud, or hard drive) via the **File System Access API** and mirrors the ensemble's repertoire with organized subfolders.
   - For iOS / iPadOS users, packages the full directory hierarchy into structured archives for the **iOS Files app** and enables 1-tap dispatch into **forScore**, **PiaScore**, or **GoodNotes**.

---

## ✨ Key Features

### 1. 1-Step Ensemble Code Sync
- **Code-Based Connection**: Choristers enter an 8-character access code (e.g. `CANTOR-4819`) to immediately pair with their choir. No personal account creation or password management required for singers.
- **Database Verification**: Validates the code against the Supabase backend and downloads the latest repertoire manifest and PDF scores for offline access.
- **Multi-Ensemble Switching**: Seamlessly manage memberships across multiple choral groups, cathedral seasons, or festival rosters.

### 2. Local Directory Sync Agent (Web for PC & iOS)
- **Direct Disk Mirroring (Desktop Chrome/Edge)**: Authorize a local folder on your computer once via the native `showDirectoryPicker` API. When repertoire updates, Refertoire writes real `.pdf` files into structured subfolders on your drive.
- **Flexible Hierarchy Layouts**:
  - **By Program**: e.g., `01 - Lent Evensong/01 - Ave Verum Corpus.pdf`
  - **By Voicing**: e.g., `SATB/Ave Verum Corpus (Mozart).pdf`
  - **By Season**: e.g., `Lent/Ave Verum Corpus.pdf`
- **iOS Files Vault**: Export the complete folder tree into a clean `.zip` archive that expands directly into a folder in the native iPadOS **Files** app.
- **1-Tap forScore / PiaScore Dispatch**: Send individual scores directly to third-party sheet music readers via the Web Share API.
- **Sync Manifest**: Automatically outputs a `.refertoire-sync.json` manifest recording last sync time and file checksums.

### 3. Study Mode with Built-in High-DPI PDF Viewer & Page Flip
- **Mozilla PDF.js Canvas Engine**: Native canvas rendering with device pixel ratio scaling for razor-sharp stave lines and choral text under extreme zoom.
- **Concert Stage Mode**: Glare-free dark palette that inverts notation to warm notation on a deep `#0B0C10` canvas, eliminating harsh white light on singers' faces during dimmed performances.
- **Hands-Free Foot Pedal Navigation**: Native support for Bluetooth pedals (AirTurn, PageFlip) and keyboard hotkeys (`ArrowLeft`, `ArrowRight`, `PageUp`, `PageDown`).
- **Tactile Page Turns**: Interactive turn zones (tap left 25% for previous, right 25% for next, center to toggle controls).

### 4. Sorting by Song Classification
- **Voicing Filters**: Filter scores instantly by `SATB`, `SSAA`, `TTBB`, `SAB`, or `Unison`.
- **Liturgical Seasons**: Sort by `Advent`, `Lent`, `Holy Week`, `Easter`, `Christmas`, `Concert`, or `General`.
- **Composer Indexing**: Group pieces alphabetically by composer surname or piece title.
- **Instant Search & Bookmarks**: Real-time filtering across titles, composers, arrangers, and rehearsal bookmarks.

### 5. Scheduling & Performance Setlists
- **Ordered Concert Programs**: Directors group and sequence pieces for specific services, evensongs, or concerts.
- **Sequence Preservation**: Singers flip straight through concert setlists in performance order without hunting through the master catalog.
- **Admin Management**: Directors can create, reorder, edit, and delete programs with real-time sync to all choristers.

---

## 🛠️ Project Structure

```text
refertoire.github.io/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml          # Automated CI/CD deployment to GitHub Pages
├── apk/
│   ├── Refertoire.apk                # Standalone Android APK binary (~49 MB)
│   └── index.html                    # Auto-download redirect page for /apk/
├── assets/                           # Device mockups (iPad Mini & Flagship Phone)
├── web/                              # Expo SDK 57 React Native & Web Application
│   ├── app/                          # Expo Router file-based routes
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx           # Tab bar: Repertoire, Programs, Sync Agent
│   │   │   ├── index.tsx             # Score library, search, and voicing filters
│   │   │   ├── setlists.tsx          # Concert programs and ordered setlists
│   │   │   └── settings.tsx          # Local Directory Sync Agent & choir settings
│   │   ├── score/[id].tsx            # Stage Mode sheet music reader
│   │   ├── login.tsx                 # Ensemble access code verification
│   │   └── download.tsx              # Standalone APK download handler
│   ├── services/
│   │   ├── hybridSyncService.ts      # File System Access API & iOS ZIP export engine
│   │   ├── databaseService.ts        # Supabase PostgreSQL queries and mutations
│   │   ├── downloadService.ts        # In-memory and disk caching
│   │   └── authService.ts            # Session management and code verification
│   ├── context/                      # RepertoireContext global state
│   ├── components/                   # Themed components, PDF viewer, upload modals
│   ├── constants/                    # Color tokens and voicing palettes
│   └── types/                        # TypeScript interfaces
├── index.html                        # Portal landing page showcasing mockups & features
├── package.json                      # Root workspace scripts
└── README.md                         # Documentation
```

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: v20+ recommended
- **npm** or **yarn**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/refertoire/refertoire.github.io.git
   cd refertoire.github.io
   ```

2. **Install dependencies**:
   ```bash
   cd web
   npm install
   ```

3. **Configure environment variables**:
   Copy `.env.example` to `.env` in the `web/` directory:
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**:
   ```bash
   # From the web directory
   npm run start

   # Or from the workspace root
   npm start
   ```

   - Press **`w`** to open in your web browser.
   - Press **`a`** to launch on an Android emulator / device.
   - Press **`i`** to launch on an iOS simulator (macOS required).
   - Scan the QR code with **Expo Go** on your physical mobile device.

---

## 🌿 Branching Strategy

The repository follows a clean two-branch deployment model:

| Branch | Purpose | Tracking |
| :--- | :--- | :--- |
| **`beta`** | Stable pre-release and staging builds for user testing. | `origin/beta` |
| **`dev`** | Active feature development and ongoing integration. | `origin/dev` |

To switch branches:
```bash
# Work on development
git checkout dev

# Switch to beta
git checkout beta
```

---

## 📦 Tech Stack

- **Platform**: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- **Frontend**: React Native 0.86, React 19, TypeScript
- **Navigation**: Expo Router v4 (`expo-router`)
- **PDF Rendering**: Mozilla PDF.js (`pdfjs-dist` CDN runtime) & `react-native-webview`
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL & Storage)
- **Local Storage**: `@react-native-async-storage/async-storage` & `expo-file-system`
- **Sharing & Device APIs**: `expo-sharing`, `expo-document-picker`
- **Icons**: `@expo/vector-icons` (Ionicons)

---

## 📄 License

This project is licensed under the MIT License.
