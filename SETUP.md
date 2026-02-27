# Neha & Naveen Wedding App — Setup Guide

## Quick Start

```bash
npm install
npx expo start
```

Scan the QR code with your phone (using the **Expo Go** app) to preview it immediately.

---

## Customise Your App

### 1. Update wedding details
Edit `constants/weddingData.ts`:
- Set the correct wedding date, venue names, addresses, and descriptions for each event
- Update the Switzerland guide with your preferred hotels, restaurants, and activities
- Update packing items as needed

### 2. Update the guest list
Edit `constants/guests.ts` — add every invited guest's full name (one per line).
The login is case-insensitive, so capitalisation doesn't need to be exact.

### 3. App icon and splash screen
Replace these files with your own images:
- `assets/images/icon.png` — 1024×1024 px app icon
- `assets/images/splash.png` — 1284×2778 px splash screen
- `assets/images/adaptive-icon.png` — Android adaptive icon

---

## Distribution Options

### Option A — Expo Go (easiest, no App Store)
1. Install **Expo Go** from the App Store on your phone
2. Run `npx expo start` on your computer
3. Scan the QR code — guests can do the same!
   > **Limitation:** guests need to download Expo Go and be on the same WiFi, or you can publish with `npx expo publish`

### Option B — TestFlight (recommended for groups)
1. Create an [Apple Developer account](https://developer.apple.com) ($99/year)
2. Install [EAS CLI](https://docs.expo.dev/eas): `npm install -g eas-cli`
3. Run `eas build --platform ios`
4. Upload to App Store Connect and distribute via **TestFlight**
5. Guests install via TestFlight (no App Store approval needed for testing)

### Option C — App Store
Same as TestFlight, but submit for App Store review.

---

## Adding a Real Backend (Optional)

Currently, all data (photos, song requests, my info) is stored **on the guest's device only**.
To collect data centrally (so you can see all song requests, guest info, etc.), integrate a backend:

### Supabase (recommended — free tier)
1. Create a project at [supabase.com](https://supabase.com)
2. Create tables: `song_requests`, `guest_info`, `photos`
3. Add your Supabase URL and anon key to a `.env` file:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Replace the storage functions in `services/storage.ts` with Supabase calls

### For photo/video uploads
Use Supabase Storage or Cloudinary. Update `services/storage.ts` `addPhoto()` to upload the file
before saving the record.

---

## Tech Stack
- **Expo** (SDK 52) + **React Native**
- **Expo Router** (file-based routing)
- **AsyncStorage** (local device storage)
- **Expo Image Picker** (photo/video selection)
- **TypeScript**
