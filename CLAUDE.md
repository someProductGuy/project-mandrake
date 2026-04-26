# Demeter (Project Mandrake)

A Progressive Web App for tracking the care and maintenance of a houseplant collection. Runs in the browser on mobile or any screen — no native app required.

---

## Jobs to Be Done

### Dashboard — the primary view
- Display a grid of tiles, one per plant
- Each tile shows the plant's name/photo and a **watering countdown bar** that drains from full → empty over the plant's watering interval (calculated from `lastWatered + wateringFrequencyDays`)
- When the bar empties (watering is overdue), a **push notification** fires and the tile enters an urgent/overdue state
- Tapping the **water drop icon** on a tile logs the watering action and resets the countdown bar to full

### Add a Plant
- User uploads 2–4 photos (recommended angles: full plant, close-up of leaves, soil/pot)
- Photos are sent to Gemini Vision, which returns:
  - Species (scientific + common name)
  - Typical watering frequency (days)
  - Light and humidity requirements
  - Any visible health concerns in the submitted photos
  - General care notes specific to the specimen
- User reviews and confirms (or edits) the identified details
- Confirmed plant is saved and a new tile appears on the dashboard

### Plant Detail View — tapping into a tile
- Full species profile: name, watering schedule, light/humidity needs, general care notes
- Timestamped photo log — user can submit new photos at any time to document the plant's condition over time
- **Ask Gemini** — a chat input where the user can ask questions about that specific plant; Gemini has context of the species profile and can optionally reference the most recent photo

### Remove a Plant
- Soft-delete from the dashboard (mark inactive) — preserves history
- Reason options: sold/donated/died (informational only, no behavioral difference in MVP)

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) | Full-stack, API routes, SSR/SSG |
| Styling | Tailwind CSS | Mobile-first, responsive |
| Database | Firebase Firestore | Real-time, pairs well with Auth + Storage |
| File Storage | Firebase Storage | Plant photos |
| Auth | Firebase Auth | Simple, supports Google sign-in |
| Push Notifications | Firebase Cloud Messaging (FCM) | Integrates with Firestore triggers |
| AI | Google Gemini (gemini-2.0-flash) | Multimodal — handles image + text; plant ID and care chat |
| Hosting | Vercel | Native Next.js support |
| PWA | next-pwa or built-in Next.js PWA support | Installable, offline shell, push permission |

---

## Data Model

### `plants` collection
```
{
  id: string
  userId: string
  commonName: string
  scientificName: string
  nickname: string | null
  coverPhotoUrl: string         // most recent or user-selected photo
  wateringFrequencyDays: number // set by Gemini, editable by user
  lastWatered: timestamp
  lightRequirement: string      // e.g. "bright indirect"
  humidityNotes: string
  careNotes: string             // Gemini-generated, editable
  status: "active" | "inactive"
  createdAt: timestamp
}
```

### `careLogs` subcollection (`plants/{plantId}/careLogs`)
```
{
  id: string
  action: "watered" | "fertilized" | "repotted" | "photo" | "note"
  timestamp: timestamp
  photoUrl: string | null
  note: string | null
}
```

### `users` collection
```
{
  id: string
  email: string
  fcmToken: string | null       // for push notifications
  notificationsEnabled: boolean
}
```

---

## Key Flows

### Watering countdown
- `nextWatering = lastWatered + wateringFrequencyDays`
- Bar fill % = `(nextWatering - now) / wateringFrequencyDays`, clamped to [0, 1]
- Bar is computed client-side and animates in real time
- A Firestore-triggered Cloud Function (or scheduled job) checks overdue plants and sends FCM notifications

### Plant identification
1. User selects 2–4 photos via file input (mobile camera or library)
2. Photos uploaded to Firebase Storage under a temp path
3. API route calls Gemini with photos + structured prompt requesting species, care schedule, health notes
4. Response parsed into a confirmation form for the user to review/edit
5. On confirm: plant document written to Firestore, photos moved to permanent path

### Push notifications
- User grants notification permission on first visit (PWA prompt)
- FCM token saved to `users/{userId}.fcmToken`
- Notification fires when `now >= nextWatering`

---

## MVP Scope

**In scope:**
- Dashboard with watering countdown tiles
- Log watering (tap water drop → reset countdown)
- Add plant via photo upload + Gemini identification
- Plant detail view (species profile + photo log + Ask Gemini chat)
- Remove plant (soft delete)
- Push notifications for overdue watering
- Single-user (auth scopes data per user, but no sharing features)

**Out of scope for MVP (noted for later):**
- Fertilizing / repotting schedules
- Multi-user / household sharing
- Plant marketplace or social features
- Offline-first / full PWA offline mode
- Third-party plant database integration
- Native mobile app

---

## Design Notes

- **Mobile-first** — primary use is on a phone; wall-mounted dashboard is a secondary view on a larger screen
- Tile grid should reflow gracefully from 2-col (mobile) to 4–6 col (large screen)
- The watering bar should be visually prominent — it is the primary glanceable signal
- Color language: healthy/full bar = green; 50% = yellow; overdue = red
- Gemini integration should feel seamless, not like a separate "AI feature" — the plant detail view is just a page that happens to have context-aware chat at the bottom
