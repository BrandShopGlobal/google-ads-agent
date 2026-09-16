# Brand Shop Google Ads AI Agent

An invite-only agency tool that researches Google Ads keywords, filters irrelevant intent, generates Responsive Search Ad assets, and creates campaigns in **Paused** status for final review.

## What is included

- Credential-free demo mode for the complete local workflow
- Supabase email/password authentication with Admin and Team Member roles
- Shared server-side Google OAuth connection
- Accessible Google Ads account selector
- AI keyword expansion and relevance scoring
- Google Keyword Plan ideas, search volume, competition and bid ranges
- Editable keyword and negative-keyword review table
- RSA headline, description and sitelink generation with hard character limits
- Admin-only paused campaign creation
- Supabase schema for projects, deployments and audit history
- Netlify deployment configuration
- Unit tests and production build checks

## 1. Run locally in demo mode

Requirements: Node.js 22 or newer and npm.

```powershell
Expand-Archive .\brand-shop-google-ads-agent.zip -DestinationPath .
cd .\brand-shop-google-ads-agent
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Demo mode is enabled by default and does not call Google, OpenAI or Supabase. The final deployment step simulates a paused campaign.

## 2. Run the verification checks

```powershell
npm test
npm run lint
npm run build
```

## 3. Configure real services

Create a Supabase project and run `supabase/migrations/202609150001_initial_schema.sql` in the SQL Editor. Disable public sign-up in Authentication settings. Invite Elley and each team member, then promote Elley with the final SQL statement shown in the migration.

In the Google Cloud project used by the existing Keyword Planner:

1. Confirm the Google Ads API is enabled and the Cloud project has the needed production access level.
2. Create or reuse OAuth 2.0 credentials.
3. Authorize `helloelley@elleynott.com` with the `https://www.googleapis.com/auth/adwords` scope and securely obtain its refresh token.
4. Confirm that this Google user has direct access to the intended client Ads accounts.

Create an OpenAI API project with billing and generate a server-side API key.

Copy `.env.example` to `.env.local`, set every required value, and change:

```env
DEMO_MODE=false
```

Never commit `.env.local`, Google refresh tokens, OAuth secrets, Supabase service-role keys, or OpenAI API keys.

## 4. Deploy through GitHub and Netlify

1. Create a private GitHub repository and push this project.
2. In Netlify, choose **Add new site → Import an existing project** and select the repository.
3. Netlify detects `netlify.toml`; keep `npm run build` as the build command.
4. Add every production variable from `.env.example` in Netlify environment variables.
5. Deploy, then attach a subdomain such as `ads.brandshop.com.au`.
6. Add the Netlify production URL to Supabase Auth URL configuration.
7. Test account discovery and keyword research first.
8. Use a designated test Ads account for the first real paused campaign.
9. Confirm the campaign is paused in Google Ads before enabling any production use.

## Permissions

- Team Members can research, edit keywords and generate campaign drafts.
- Admins can also create paused campaigns through Google Ads.
- The Google OAuth and API credentials stay on the server and are never sent to team browsers.

## Important production note

Google Ads API versions and access-level requirements change over time. `GOOGLE_ADS_API_VERSION` is configurable so the project can be upgraded without changing every request URL. Verify the currently supported version before production deployment.
