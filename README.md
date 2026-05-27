# LaunchKit Minimal

Minimal open-source launch validation kit for indie hackers and solo builders.

It gives you a small, editable launch workspace with:

- Public launch pages at `/launch/:slug`
- Waitlist signup collection
- Feedback board with upvotes
- Lightweight launch analytics
- Local-first demo storage with a SQL migration for real persistence

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL and start from the demo project. The app stores demo data in
`localStorage`, so it works without setting up a database.

## Scripts

```bash
npm run dev      # start the local app
npm run build    # type-check and build
npm test         # run unit tests
```

## Project Shape

```text
src/App.tsx              # admin workspace and public launch page
src/lib/launchkit.ts     # core data model and actions
src/lib/launchkit.test.ts
migrations/0001_launchkit.sql
```

## Persistence

The starter uses `localStorage` so people can clone and try it immediately. For production,
wire the functions in `src/lib/launchkit.ts` to your API/database layer and apply
`migrations/0001_launchkit.sql` to SQLite-compatible storage such as Cloudflare D1.

## License

MIT
