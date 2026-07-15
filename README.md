# Fun Date

A "will you go on a date with me" page with a dodging No button, followed by a
date/time/activity picker that saves responses to Supabase.

## Local dev

```
npm install
npm run dev
```

## Push to GitHub

```
cd fun-date
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

(Create the empty repo on github.com first — New repository, no README/gitignore.)

## Connect Vercel

1. Go to vercel.com/new
2. Import the GitHub repo you just pushed
3. Framework preset: Next.js (auto-detected) — no env vars needed, the Supabase
   publishable key is safe to ship client-side and is already in lib/supabaseClient.ts
4. Deploy

Responses page is at `/responses`, passcode: `ourdate26` (change it in
app/responses/page.tsx before sharing the link).
