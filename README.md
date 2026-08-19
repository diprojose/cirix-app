This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AI support demo

`/ai-support` runs in deterministic simulated mode by default and makes no
OpenAI requests. The active mode is shown prominently in the workspace.

To enable live AI for a presentation, configure these server-side variables in
Vercel and redeploy:

```env
AI_SUPPORT_ENABLED=true
OPENAI_API_KEY=...
AI_SUPPORT_MODEL=gpt-5.6-luna
AI_RATE_LIMIT_SECRET=<at-least-24-random-characters>
```

After the presentation, set `AI_SUPPORT_ENABLED=false` and redeploy. Live mode
uses Firestore documents in `ai_support_rate_limits`; enable a Firestore TTL
policy for their `expiresAt` field so expired counters are removed automatically.
