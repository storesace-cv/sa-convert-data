# StoresAce - Desktop macOS Wrapper Guide

## Overview
This guide explains how to package the StoresAce PWA as a native macOS application using Electron or Tauri.

## Option 1: Tauri (Recommended - Smaller Bundle)

### Prerequisites
- Rust toolchain: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Node.js 18+
- Xcode Command Line Tools: `xcode-select --install`

### Setup
```bash
npm install -D @tauri-apps/cli
npm install @tauri-apps/api
```

### Configuration (tauri.conf.json)
```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "StoresAce",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.storesace.app",
      "icon": ["icons/icon.icns"],
      "targets": ["dmg", "app"],
      "macOS": {
        "minimumSystemVersion": "13.0"
      }
    }
  }
}
```

### Build
```bash
npm run tauri build -- --target universal-apple-darwin
```

## Option 2: Electron

### Prerequisites
- Node.js 18+

### Setup
```bash
npm install -D electron electron-builder
```

### Main Process (electron/main.js)
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createWindow);
```

### Build Configuration (package.json)
```json
{
  "build": {
    "appId": "com.storesace.app",
    "productName": "StoresAce",
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.business",
      "icon": "build/icon.icns",
      "minimumSystemVersion": "13.0",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist"
    }
  }
}
```

## Code Signing & Notarization

### 1. Create Apple Developer Certificate
- Login to Apple Developer Portal
- Create "Developer ID Application" certificate
- Download and install in Keychain

### 2. Sign the App
```bash
codesign --deep --force --verify --verbose --sign "Developer ID Application: YOUR_NAME" --options runtime StoresAce.app
```

### 3. Create DMG
```bash
hdiutil create -volname "StoresAce" -srcfolder StoresAce.app -ov -format UDZO StoresAce.dmg
```

### 4. Notarize
```bash
xcrun notarytool submit StoresAce.dmg --apple-id YOUR_APPLE_ID --password APP_SPECIFIC_PASSWORD --team-id TEAM_ID --wait
xcrun stapler staple StoresAce.dmg
```

## Icon Creation (.icns)

### Using iconutil (macOS)
```bash
mkdir StoresAce.iconset
# Add icon files: icon_16x16.png, icon_32x32.png, ..., icon_512x512@2x.png
iconutil -c icns StoresAce.iconset -o StoresAce.icns
```

## Distribution
- Upload signed .dmg to your server
- Users drag to /Applications folder
- App runs with full offline support via IndexedDB

## Auto-Update (Optional)
Configure electron-updater or Tauri updater to check for updates from your server.
