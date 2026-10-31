# Don't Ghost Me · web

This is the Next.js app and its API routes. The project overview, architecture and setup steps are in the [root README](../README.md).

Quick start:

```bash
npm install
npm run dev                                    # http://localhost:3000
cloudflared tunnel --url http://localhost:3000 # HTTPS for phones (mic and camera)
```

`.env.local` needs `OPENAI_API_KEY`, `BACKEND=mock|live` and `AGENT_URL`. Deployed actors also need `TERSE_ACTOR_URL` and `TERSE_API_KEY`. See the root README for the full list.
