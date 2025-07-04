# Automated Social Push – Quick Setup

## 1. Install Dependencies
```
pnpm add -D puppeteer node-fetch form-data dotenv
```

## 2. Create `.env`
```
WEBSITE_URL=https://clipscommerce.com
# Optional – a live dashboard view reachable without auth
DASHBOARD_URL=https://clipscommerce.com/demo/dashboard

BUFFER_ACCESS_TOKEN=PASTE_YOUR_TOKEN
# Comma-separated Buffer profile IDs (find in each profile's Settings → API section)
BUFFER_PROFILE_IDS=twitter_id,linkedin_id
```

How to get `BUFFER_ACCESS_TOKEN` and profile IDs:
1. Sign up at https://buffer.com (free tier is enough).
2. Connect the two social accounts you want (e.g., X / LinkedIn).
3. Go to **Settings → Developers → Create Access Token** (scope: `publish`).
4. Copy the token into `.env`.
5. Each connected channel shows a numeric **Profile ID**—copy them into `BUFFER_PROFILE_IDS`.

## 3. First Run
```
pnpx ts-node scripts/automated_marketing.ts
```
• Screenshots save into `screenshots/`.  
• Script uploads media → Buffer and schedules a post with today's date caption.

## 4. Automate Daily
Add to `package.json`:
```json
"scripts": {
  "post:social": "ts-node scripts/automated_marketing.ts"
}
```
Then create a GitHub Action (free minutes):
```yaml
# .github/workflows/social.yml
name: Daily Social Blast
on:
  schedule:
    - cron: "0 15 * * *" # 15:00 UTC
  workflow_dispatch:
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install --frozen-lockfile
      - run: pnpm post:social
        env:
          WEBSITE_URL: ${{ secrets.WEBSITE_URL }}
          DASHBOARD_URL: ${{ secrets.DASHBOARD_URL }}
          BUFFER_ACCESS_TOKEN: ${{ secrets.BUFFER_ACCESS_TOKEN }}
          BUFFER_PROFILE_IDS: ${{ secrets.BUFFER_PROFILE_IDS }}
```
Add the four secrets in your repo → **Settings → Secrets → Actions**.

## 5. Extend
• Add more pages to screenshot by setting `EXTRA_URLS` env and updating the script.  
• Create separate captions per platform by branching on profile type. 