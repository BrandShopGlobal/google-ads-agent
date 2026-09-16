# Brand Shop Google Ads AI Agent Design

## Goal

Build an invite-only internal agency application that turns a small brief into researched keywords, reviewed ad assets, and a paused Google Ads Search campaign. It must run locally before being deployed from GitHub to Netlify.

## Decisions

- Build a standalone Next.js application, not a WordPress plugin.
- Host on Netlify and expose it from a Brand Shop subdomain.
- Use Supabase Auth and Postgres for invited users and saved projects.
- Use one server-side Google OAuth connection belonging to `helloelley@elleynott.com`.
- Admins can deploy paused campaigns; team members can research and prepare drafts.
- Every campaign created through the API must be `PAUSED`.
- Include a demo mode that exercises the complete interface without paid APIs.

## Architecture

The Next.js application owns the UI and server routes. Browser code never receives OpenAI, Google OAuth, Supabase service-role, or Google Ads secrets. Supabase provides authentication and persistent projects. OpenAI performs structured keyword expansion, relevance classification, clustering, and RSA asset generation. The Google Ads REST API lists accessible customers, enriches keyword ideas with metrics, and creates approved campaign resources.

## User Flow

1. An invited user signs in or enters local demo mode.
2. The user creates a project with seed keywords, URL, business description, geography, language, and minimum volume.
3. OpenAI expands seeds and derives commercial-intent variations.
4. Google Ads returns keyword ideas and historical metrics in batches.
5. Deterministic volume filtering runs before AI relevance classification.
6. The user edits, selects, rejects, or marks negative keywords in a review table.
7. OpenAI clusters approved keywords and produces RSA headlines, descriptions, and sitelinks.
8. The user configures budget, bidding, match types, and final URL.
9. An Admin confirms deployment. The backend validates the complete payload and creates a paused campaign.
10. The app stores the request, result, Google resource names, actor, and timestamp.

## Roles

- `admin`: all team-member abilities plus Google Ads deployment.
- `member`: keyword research, editing, creative generation, and draft saving.

Public registration is disabled. Profiles are created for invited Supabase users.

## Safety and Security

- Secrets exist only in local `.env.local` or Netlify environment variables.
- `.env*` files are excluded from Git and the ZIP except `.env.example`.
- API routes verify Supabase access tokens outside demo mode.
- Server-side schemas reject malformed input and enforce Google character limits.
- Deploy requests require an explicit confirmation string and an Admin profile.
- Campaign status is hard-coded to `PAUSED`, not accepted from the browser.
- Google customer IDs are normalized and validated.
- Website fetching rejects localhost, private IP ranges, and non-HTTP protocols.
- API failures return safe messages while detailed diagnostics remain server-side.

## Demo Mode

`DEMO_MODE=true` enables deterministic sample accounts, keyword metrics, creatives, and a simulated paused campaign. It is intended for local UI verification only. Production deployment must set `DEMO_MODE=false`.

## Persistence

Supabase tables store profiles, projects, keyword snapshots, creative drafts, deployments, and audit events. Row-level security permits invited users to read and edit team data while restricting role changes and deployment records to Admins/server code.

## Testing

- Unit tests cover schemas, filtering, character limits, customer-ID normalization, grouping, and deploy guards.
- Route/service behavior is tested with demo providers.
- `npm run lint`, `npm test`, and `npm run build` must pass before packaging.
- Manual test instructions cover local demo mode and real credential mode.

## Delivery

The ZIP contains complete source, Supabase migration, `.env.example`, Netlify configuration, setup guide, and test suite. It excludes dependencies, builds, credentials, and local environment files.
