# Brand Shop Google Ads AI Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a locally runnable, Netlify-ready Google Ads campaign research and creation application.

**Architecture:** A Next.js App Router application exposes authenticated server routes backed by provider interfaces. Demo providers support credential-free local verification; production providers use Supabase, OpenAI Responses API, and Google Ads REST API.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Supabase, Zod, Vitest, OpenAI Responses API, Google Ads REST API, Netlify.

**Spec:** `docs/superpowers/specs/2026-09-15-google-ads-ai-agent-design.md`

## Global Constraints

- Campaigns are always created with status `PAUSED`.
- Only Admins can deploy campaigns.
- No secret is exposed to client components.
- Demo mode must support the full local workflow without external credentials.
- Public registration is disabled.

---

### Task 1: Foundation and domain validation

**Files:** Create project configuration, domain types, Zod schemas, filtering utilities, and unit tests.

- [ ] Write failing tests for volume filters, character limits, customer IDs, and deployment confirmation.
- [ ] Run tests and verify they fail.
- [ ] Implement the domain schemas and utilities.
- [ ] Run focused tests and verify they pass.

### Task 2: Provider boundaries and demo implementation

**Files:** Create AI, Google Ads, authentication, and persistence provider modules plus demo fixtures.

- [ ] Write provider contract tests against demo implementations.
- [ ] Verify the tests fail.
- [ ] Implement deterministic demo providers.
- [ ] Verify provider tests pass.

### Task 3: Production API integrations

**Files:** Create server-only OpenAI, Google OAuth, Google Ads REST, Supabase auth, and Supabase persistence modules.

- [ ] Test parsers and request builders without network calls.
- [ ] Implement token refresh, account discovery, keyword ideas, structured AI calls, and paused campaign mutations.
- [ ] Confirm production providers cannot initialize without required environment values.

### Task 4: Authenticated API routes

**Files:** Create account, research, creative, project, and deployment route handlers.

- [ ] Add route-level tests for invalid input and authorization.
- [ ] Implement schema validation and provider calls.
- [ ] Enforce Admin deployment and the explicit confirmation phrase.

### Task 5: Application interface

**Files:** Create login, dashboard, workflow steps, account selector, keyword table, creative editor, campaign review, and status components.

- [ ] Build the responsive Brand Shop interface.
- [ ] Connect every stage to its server route.
- [ ] Add loading, empty, success, and recoverable error states.
- [ ] Verify keyboard and mobile usability.

### Task 6: Database and deployment setup

**Files:** Create Supabase SQL migration, Netlify config, environment template, and setup documentation.

- [ ] Define tables, indexes, triggers, RLS, and role policies.
- [ ] Document local demo startup.
- [ ] Document Google, Supabase, OpenAI, and Netlify setup.
- [ ] Document GitHub-to-Netlify deployment and production smoke tests.

### Task 7: Verification and packaging

**Files:** Update README and package metadata; create the distributable ZIP.

- [ ] Install dependencies from a clean lockfile.
- [ ] Run unit tests, lint, TypeScript checking, and production build.
- [ ] Scan the deliverable for secrets and excluded build artifacts.
- [ ] Create a ZIP that expands into one project directory.
- [ ] Verify ZIP contents and archive integrity.
