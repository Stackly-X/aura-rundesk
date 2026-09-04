# Rundesk Chat – Fast parity pass

This pass keeps the existing Next.js + Prisma + MySQL architecture and focuses on the ClickUp-style chat interactions while retaining the Rundesk visual identity.

## Implemented in this pass

- Compact, draggable, collapsible Rundesk navigation and Chat sidebar with persisted widths.
- Narrow ClickUp-style right utility rail in Rundesk styling.
- Followers/Members, Find in Channel, Replies (Unread/Read), Assigned Messages (Open/Resolved), and Channel Settings panels.
- Inline message editing instead of browser prompts.
- Message actions: reply, reactions, assign follow-up, create task, copy text, copy link, edit, delete, mark unread.
- Denser message layout, real date dividers, and database-backed New divider based on last-read state.
- DM display names use conversation/member names instead of internal `dm-*` channel identifiers.
- Database-backed channel members and search.
- Assignment picker panel instead of a browser prompt.
- Voice/microphone recording via `getUserMedia` + `MediaRecorder`, with browser permission handling, timer, discard, upload, and pending audio preview.
- Attachment-only messages are supported so voice recordings can be sent without extra text.
- Composer controls remain connected to mentions, emoji, files, tasks, clips, whiteboard placeholders, slash commands, and AI setup state.
- Rundesk white/lavender/gradient theme tightened across headers, messages, panels, composer, and utility controls.

## Validation

- `tsc --noEmit` passed.
- ESLint passed with zero warnings for the implementation folders.
- No Prisma schema reset or destructive migration was introduced.

## Local run

Keep your existing private `.env` file in the project root, then run:

```bash
npm install
npm run db:generate
npm run dev
```

Open `http://localhost:3000`.
