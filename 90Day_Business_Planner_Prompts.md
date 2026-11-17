# 90-Day Business Planner — Build Prompts (Next.js + MongoDB)

Use these prompts **in order** with Claude Code, Cursor, or any AI coding tool. Each prompt builds on the previous one. After each prompt: run the app, test it, commit to Git, then move on.

## Status tracker

Legend: [x] done, [ ] not done, [~] in progress.

- [x] Project overall: initial app scaffold is created in the workspace under the project folder.
- [x] Prompt 0 — Master context
- [x] Prompt 1 — Project setup
- [x] Prompt 2 — Database models
- [~] Prompt 3 — Import the Excel data (scripts are ready; waiting for the workbook)
- [x] Prompt 4 — Authentication
- [~] Prompt 5 — Start a plan (implementation is ready; requires seeded MongoDB data to exercise)
- [~] Prompt 6 — Today page (implementation is ready; requires active plans to exercise)
- [~] Prompt 7 — Plan detail page (implementation is ready; requires seeded plans to exercise)
- [~] Prompt 8 — Dashboard with progress charts (implementation is ready; requires user data to exercise)
- [ ] Prompt 9 — Calendar view (optional)
- [~] Prompt 10 — Income tracker (implementation is ready; requires MongoDB to exercise)
- [ ] Prompt 11 — Leads / outreach CRM
- [ ] Prompt 12 — Daily notes and weekly review (optional)
- [ ] Prompt 13 — Settings and data export
- [ ] Prompt 14 — PWA and reminders (optional)
- [ ] Prompt 15 — Security hardening
- [ ] Prompt 16 — Testing
- [ ] Prompt 17 — Deploy
- [ ] Prompt 18 — Final polish

> Current implementation: the project scaffold, database models, Excel export/seed scripts, authentication, and start-plan flow are in place. The Excel import and database-backed flows still need the workbook and a configured MongoDB connection for end-to-end testing.

---

## What the app is (based on your Excel file)

Your spreadsheet `Full_90Day_Business_Plan.xlsx` has:

- **1 Master Overview sheet**: 10 businesses with Investment, Income Potential, and "Days to First ₹".
- **10 business sheets**: each one a 90-day daily plan with columns `Day, Date, Phase, Today's Exact Task, Time (hrs), Done ✓, Notes`.
- **7 phases**: Research & Setup → Build Presence → First Samples/Launch → Active Outreach → First Customer → Iterate & Improve → Scale & Systems.
- Some sheets have blank tasks on the last days (e.g. Day 82–90), so the app must let you add your own tasks.
- The original start date is **29 Jun 2026**, which has already passed, so the app must let the user **choose their own start date**.

**App idea:** a web app that turns this Excel into a live tracker: pick a business, set a start date, see "Today's Task", tick tasks done, log income and leads, and see progress charts.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Database | MongoDB Atlas (free tier) + Mongoose |
| Auth | Auth.js (NextAuth) with email/password |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Validation | Zod |
| Hosting | Vercel |

---

## 1-Month Build Plan (16 Nov → 15 Dec 2026)

You have about 30 days, so the plan below builds the **core app first** and moves three nice-to-have prompts (Calendar, Weekly Reviews, PWA) to the end as optional extras.

### Gantt chart

```mermaid
gantt
    title 90-Day Business Planner - 1 Month Build (16 Nov - 15 Dec 2026)
    dateFormat YYYY-MM-DD
    axisFormat %d %b

    section Week 1 - Foundation
    P1 Project setup              :p1, 2026-11-16, 1d
    P2 Database models            :p2, 2026-11-17, 1d
    P3 Excel import and seed      :p3, 2026-11-18, 2d
    P4 Authentication             :p4, 2026-11-20, 2d
    Buffer / catch-up             :b1, 2026-11-22, 1d

    section Week 2 - Core features
    P5 Start a plan               :p5, 2026-11-23, 2d
    P6 Today page (main screen)   :p6, 2026-11-25, 3d
    P7 Plan detail (90 days)      :p7, 2026-11-28, 2d
    P8 Dashboard and charts       :p8, 2026-11-30, 2d

    section Week 3 - Money and leads
    P10 Income tracker            :p10, 2026-12-02, 2d
    P11 Leads / outreach CRM      :p11, 2026-12-04, 3d
    P13 Settings and export       :p13, 2026-12-07, 1d

    section Week 4 - Ship it
    P15 Security hardening        :p15, 2026-12-08, 1d
    P16 Testing                   :p16, 2026-12-09, 2d
    P17 Deploy (Atlas + Vercel)   :p17, 2026-12-11, 2d
    P18 Final polish              :p18, 2026-12-13, 2d
    LAUNCH                        :milestone, m1, 2026-12-15, 0d

    section Optional (only if ahead)
    P9 Calendar view              :o1, 2026-12-16, 2d
    P12 Weekly reviews            :o2, 2026-12-18, 2d
    P14 PWA and reminders         :o3, 2026-12-20, 2d
``

> If your viewer does not render Mermaid charts, paste the code block into https://mermaid.live to see the chart, or use the table below.

### Same plan as a table

| Week | Dates | Goal | Prompts |
|---|---|---|---|
| 1 | 16–22 Nov | Setup, database, Excel import, login | 0–4 |
| 2 | 23–29 Nov | Start plan, Today page, plan detail | 5–7 |
| 3 | 30 Nov–6 Dec | Dashboard, income, leads CRM | 8, 10, 11 |
| 4 | 7–13 Dec | Settings, security, tests, deploy | 13, 15, 16, 17 |
| Finish | 14–15 Dec | Polish and **launch** | 18 |
| Optional | 16–21 Dec | Calendar, reviews, PWA | 9, 12, 14 |

### Rules to hit one month

- **Work ~2–3 hours every day.** Skipping a day pushes everything back.
- **Do not start a new prompt until the previous one runs without errors.**
- **MVP = Prompts 0–8.** If you are behind by Day 14, cut Prompt 11 (Leads CRM) and keep the rest.
- Use the **Buffer day** (22 Nov) to catch up, not to rest.
- Prompts marked optional in the chart are **skipped before launch**. You can run them any time after.

---

## Prompt 0 — Master context (paste this FIRST in every new AI session)

```
You are a senior full-stack engineer helping me build a "90-Day Business Planner" web app.

STACK: Next.js (App Router, latest stable), TypeScript (strict), MongoDB Atlas with Mongoose, Auth.js (NextAuth) credentials login, Tailwind CSS, shadcn/ui, Recharts, Zod, deployed on Vercel.

PRODUCT: Users pick one or more of 10 business ideas (Content Writing, Social Media Management, Video Editing, Reselling, Online Tuition, Print on Demand, Affiliate Marketing, Digital Products, Local Service Aggregator, Freelance Web/No-Code Dev). Each business has a 90-day daily task plan split into 7 phases. The user chooses a start date, sees today's task, marks tasks done, logs time/notes, tracks income and leads, and sees progress charts.

CURRENCY: Indian Rupees (₹). Use Intl.NumberFormat("en-IN") for formatting. Dates in "DD MMM YYYY" format. Timezone Asia/Colombo.

RULES:
- Use the App Router, Server Components by default, Client Components only when needed.
- Validate every API input with Zod. Never trust client data.
- Every database query must be scoped to the logged-in user's id.
- Mobile-first, clean, minimal UI. Support dark mode.
- Write small, reusable components. Add loading and error states.
- Explain what files you create or change, and give me the commands to run.
- Do not add libraries I did not ask for without telling me why.

Reply "Ready" and wait for my first task.
```

---

## Prompt 1 — Project setup

```
Create the project setup for the 90-Day Business Planner.

1. Give me the exact commands to create a Next.js app with TypeScript, Tailwind, ESLint, App Router, and the src/ directory.
2. Install: mongoose, zod, next-auth, bcryptjs, recharts, date-fns, lucide-react, and initialise shadcn/ui.
3. Add these shadcn components: button, card, input, label, checkbox, dialog, tabs, badge, progress, select, textarea, dropdown-menu, sonner (toast).
4. Create this folder structure:
   src/app/(auth)/login, src/app/(auth)/register
   src/app/(app)/dashboard, today, plan/[planId], income, leads, settings
   src/app/api/...
   src/lib/db.ts, src/lib/auth.ts, src/lib/validators/, src/models/, src/components/, src/types/
5. Create .env.example with MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL.
6. Create src/lib/db.ts with a cached Mongoose connection that works safely with Next.js hot reload and serverless.
7. Add a /api/health route that connects to MongoDB and returns { ok: true }.

Show every file in full.
```

---

## Prompt 2 — Database models (Mongoose)

```
Create Mongoose models in src/models/ with TypeScript types and indexes.

1. User: name, email (unique, lowercase), passwordHash, timezone (default "Asia/Colombo"), createdAt.

2. BusinessTemplate (read-only master data from my Excel):
   slug (unique), number (1-10), name, investment (string, e.g. "₹0–₹2,000"), incomePotential (string), daysToFirstIncome (number), sheetName, description (optional), emoji (optional).

3. TemplateTask (the 90-day plan from my Excel):
   templateSlug, day (1-90), phase (enum of the 7 phases), title (string), defaultHours (number, optional).
   Unique compound index on (templateSlug, day). Some days may have no title in the Excel, so allow title to be empty.

4. UserPlan (a user's active instance of a business):
   userId, templateSlug, startDate, status (active | paused | completed), createdAt.
   Compound index on (userId, templateSlug).

5. PlanTask (user's copy of each task so they can edit and complete it):
   planId, userId, day, date (computed from startDate + day - 1), phase, title, isCustom (boolean), done (boolean), doneAt, hoursSpent, notes.
   Compound unique index on (planId, day).

6. IncomeEntry: userId, planId, amount (number in rupees), source (string), date, note.

7. Lead (outreach CRM): userId, planId, name, platform (instagram | linkedin | email | whatsapp | upwork | fiverr | other), contact, status (new | contacted | replied | proposal | won | lost), nextFollowUpDate, notes, valueExpected, createdAt.

Add timestamps to everything. Export a typed model for each and avoid model re-compilation errors in dev.
```

---

## Prompt 3 — Import the Excel data (seed script)

```
I have an Excel file named Full_90Day_Business_Plan.xlsx with:

Sheet 1 "📋 Master Overview": rows with columns # | Business Name | Investment | Income Potential | Sheet Tab | Days to First ₹ (values like "~Day 30"). The business rows are rows 3–12. Below them is a PHASE GUIDE.

Sheets 2–11 are named "01. Content Writing & Co", "02. Social Media Managem", etc. Each has: row 1 = title, row 2 = investment/income/start date text, row 3 = headers: Day | Date | Phase | Today's Exact Task | Time (hrs) | Done ✓ | Notes. Rows 4–93 are Day 1 to Day 90.
Some days at the end have an empty "Today's Exact Task" — keep them with title "".

Write a Node/TypeScript script scripts/export-excel-to-json.ts that:
1. Uses the "xlsx" package to read the Excel file from /data/Full_90Day_Business_Plan.xlsx.
2. Produces /data/templates.json (the 10 businesses; make a slug like "content-writing", "social-media-management", "video-editing", "reselling", "online-tuition", "print-on-demand", "affiliate-marketing", "digital-products", "local-service-aggregator", "freelance-web-dev") and /data/tasks.json (all tasks with templateSlug, day, phase, title, defaultHours).
3. Parses "~Day 30" into the number 30.
4. Prints a summary table: business name, number of days found, number of empty-title days.

Then write scripts/seed.ts that reads those two JSON files and upserts into MongoDB (BusinessTemplate and TemplateTask) so it is safe to run multiple times. Add npm scripts: "export:excel" and "seed". Tell me where to put the Excel file.
```

---

## Prompt 4 — Authentication

```
Implement authentication with Auth.js (NextAuth) using the Credentials provider and JWT sessions.

- /register page: name, email, password (min 8 chars) with Zod validation. Hash with bcryptjs. Reject duplicate emails with a clear error.
- /login page: email + password. Show friendly errors.
- Add a middleware.ts that protects everything under the (app) group and redirects unauthenticated users to /login. Redirect logged-in users away from /login and /register.
- Put the user's id in the session so I can read session.user.id on the server.
- Create a helper getCurrentUser() in src/lib/auth.ts for Server Components and API routes.
- Add a simple top navbar with: Dashboard, Today, Income, Leads, Settings, and a user menu with Logout.

Use shadcn/ui forms. Make the pages look clean and centered, mobile-friendly.
```

---

## Prompt 5 — Start a plan (choose business + start date)

```
Build the "Start a Plan" flow.

1. Dashboard shows a grid of the 10 BusinessTemplate cards: emoji, name, investment, income potential, "Days to first ₹". Cards for businesses the user already started show a "Continue" button instead of "Start".
2. Clicking Start opens a dialog asking for a start date (default: today; allow past or future dates).
3. POST /api/plans: validates with Zod, creates a UserPlan, then copies all TemplateTask documents for that template into PlanTask documents for this user. Compute each task date = startDate + (day - 1). Use a MongoDB transaction or insertMany with rollback on failure. Prevent starting the same business twice while one is active.
4. Allow multiple active plans (the user may try 2–3 businesses), but show a gentle warning after 3: "Focus beats spreading thin."
5. PATCH /api/plans/[id] to change status (active/paused/completed) or shift the start date (recalculate all PlanTask dates).
6. DELETE /api/plans/[id] deletes the plan and all related PlanTasks, with a confirm dialog.

Return typed responses and handle errors with proper HTTP status codes.
```

---

## Prompt 6 — "Today" page (the main screen)

```
Build the /today page — the most important screen.

For each active plan, show a card with:
- Business name and emoji, current phase badge, "Day X of 90".
- Today's exact task in large readable text (the PlanTask whose date equals today in the user's timezone).
- A big "Mark as done" checkbox/button, an hours-spent input, and a notes textarea that auto-saves (debounced).
- If today's task is empty (blank day in the Excel), show a friendly "Add your own task for today" input that saves it as an isCustom task.
- If today is before the start date, show "Starts in N days". If after Day 90, show "Plan finished 🎉" with a link to review results.
- Below it, a section "Missed tasks": undone tasks from earlier days, each with a quick "Mark done" and "Move to today" button.
- A section "Coming up": the next 3 tasks.
- Show the current streak (consecutive days with the task done).

Use PATCH /api/plan-tasks/[id] to update done, hoursSpent, notes. Use optimistic UI updates with rollback on failure. Include loading skeletons.
```

---

## Prompt 7 — Plan detail page (all 90 days)

```
Build /plan/[planId] showing the full 90-day plan.

- Header: business name, start/end dates, overall progress bar (% done), total hours logged, total income logged for this plan.
- Group tasks by the 7 phases in collapsible sections, each with its own progress bar.
- Each row: Day, Date, task title, done checkbox, hours, notes icon. Highlight today's row. Mark overdue rows in red/amber.
- Inline edit: user can rename a task, add a custom task to any day, or delete a custom task. Template tasks can be edited but show a "reset to original" option.
- Filter chips: All / Done / Pending / Overdue. Search box for task text.
- Pagination or virtualization is not needed; 90 rows is fine, but keep it fast.
- "Export to CSV" button that downloads the user's progress for that plan.

Server-render the initial data and use Client Components only for interactive parts.
```

---

## Prompt 8 — Dashboard with progress charts

```
Upgrade the /dashboard page.

Top row of stat cards:
- Active plans, tasks done this week, current streak, total income (₹), total hours.

Charts (Recharts, responsive):
1. Progress per active plan (horizontal bar, % complete).
2. Tasks completed per day for the last 30 days (bar chart).
3. Income per week (line chart) with a dotted target line the user can set.
4. Phase completion donut for the selected plan.

Add a plan selector (dropdown) that filters the charts. Build the aggregation with MongoDB aggregation pipelines in a /api/stats route (not by loading everything into the client). Handle empty states with helpful messages like "Complete your first task to see your chart."
```

---

## Prompt 9 — Calendar view (optional)

```
Add a /calendar page with a monthly calendar grid (build it with date-fns, no heavy calendar library).

- Each day cell shows small colored dots for each active plan's task that day (green = done, grey = pending, red = overdue).
- Clicking a day opens a side panel/dialog listing that day's tasks across all plans with checkboxes to mark done.
- Navigation: previous/next month, "Today" button.
- On mobile, switch to a vertical agenda list for the week.
```

---

## Prompt 10 — Income tracker

```
Build /income.

- Form to add an income entry: amount (₹), plan (dropdown, optional), source/client name, date, note.
- Table of entries with edit and delete, sorted by newest, with filters by plan and date range.
- Summary cards: this month, last month, all-time, best month, and "Days to first ₹" (days between plan start date and the first income entry) compared to the template's expected "Days to First ₹" from the Excel overview.
- Monthly goal setting (stored on the User) with a progress bar toward the goal.
- Export CSV.

API: GET/POST /api/income, PATCH/DELETE /api/income/[id], all validated with Zod and scoped to the user.
```

---

## Prompt 11 — Leads / outreach CRM

```
Many tasks in the plan are outreach tasks like "Send DMs to 10 potential clients" or "Follow up with all unanswered DMs". Build a simple CRM at /leads.

- Kanban board with columns: New, Contacted, Replied, Proposal, Won, Lost. Drag and drop between columns (use @dnd-kit) and also a list view toggle for mobile.
- Add lead dialog: name, platform, contact (handle/email/phone), plan, expected value (₹), next follow-up date, notes.
- "Follow-ups due today" banner at the top, and the same count shown on the navbar and the Today page.
- Stats: reply rate (replied / contacted), win rate, total pipeline value.
- When a lead is moved to "Won", offer to create an income entry with the expected value pre-filled.
- Filters by plan and platform; search by name.

Create the API routes with Zod validation and user scoping.
```

---

## Prompt 12 — Daily notes and weekly review (optional)

```
Add a weekly review feature, because the Excel has tasks like "Week 4 review: revenue = ₹? Clients = ? Lessons?".

- When a task title contains the word "review" (case-insensitive), show a "Start review" button on that task.
- The review dialog has fields: revenue this week (₹), clients/customers count, what worked, what didn't, one lesson, next week's focus. Save as a Review document linked to the plan and day.
- /plan/[planId]/reviews lists all reviews in a timeline.
- Auto-fill revenue from IncomeEntry totals for that week.
- Optional: "Copy as text" button so the user can paste the review into a LinkedIn or Instagram "progress update" post.
```

---

## Prompt 13 — Settings and data export

```
Build /settings.

- Profile: change name, timezone, monthly income goal.
- Change password (require the current password).
- Reminder preference (stored only for now): daily reminder time.
- Export all my data as one JSON file (plans, tasks, income, leads, reviews).
- Danger zone: delete account and all data, with a typed confirmation ("DELETE").

Everything validated with Zod, and all queries scoped to the user.
```

---

## Prompt 14 — PWA and reminders (optional)

```
Make the app installable as a PWA so I can use it like a phone app.

- Add a web app manifest with name, icons (give me placeholder SVG/PNG generation steps), theme color, and standalone display.
- Add a basic service worker that caches the app shell and shows an offline page.
- Add an "Install app" prompt button in Settings.
- If simple enough, add browser Web Push or a daily email reminder using a Vercel Cron job that calls /api/cron/reminders at the user's reminder time and lists today's pending tasks. Protect the cron route with a secret header.

Explain any trade-offs and keep it minimal.
```

---

## Prompt 15 — Security hardening

```
Review the whole codebase for security and fix issues. Check and fix:

1. Every API route checks the session and filters by userId (no IDOR — a user must never read or edit another user's data by guessing an ObjectId).
2. All inputs validated with Zod; reject unknown fields.
3. Rate limiting on /api/auth and /register (simple in-memory or MongoDB-based limiter is fine).
4. Passwords: bcrypt cost 12, never returned in any response.
5. Security headers in next.config (CSP, X-Frame-Options, Referrer-Policy, etc.).
6. MongoDB injection: make sure no raw user object goes into a query ($ operators).
7. Environment variables: nothing secret is exposed to the client.
8. Proper error handling that never leaks stack traces in production.

Give me a checklist of what you found and the exact code changes.
```

---

## Prompt 16 — Testing

```
Add tests.

1. Unit tests (Vitest) for: date calculation (startDate + day), streak calculation, Excel parsing helpers, Zod schemas.
2. API tests for: register/login, starting a plan (creates exactly 90 PlanTasks), marking a task done, and user isolation (user A cannot access user B's plan).
3. One end-to-end test with Playwright: register → start "Content Writing" plan → see Day 1 task on /today → mark done → progress shows 1/90.

Use mongodb-memory-server for DB tests. Add npm scripts and show me how to run them.
```

---

## Prompt 17 — Deploy

```
Help me deploy to production.

1. Step-by-step MongoDB Atlas setup: free cluster, database user, network access for Vercel, and the connection string format for MONGODB_URI.
2. Step-by-step Vercel deployment from a GitHub repo: environment variables, NEXTAUTH_URL, NEXTAUTH_SECRET (how to generate), and how to run the seed script against production once.
3. Add a README.md with setup instructions, scripts, and the folder structure.
4. Add a basic GitHub Actions workflow that runs lint, type-check, and tests on every push.
5. Production checklist: custom domain (optional), error monitoring (Sentry free tier), Atlas backups, uptime check on /api/health.
```

---

## Prompt 18 — Final polish

```
Do a final polish pass:

- Accessibility: keyboard navigation, aria labels, focus states, color contrast.
- Empty states and friendly microcopy on every page (motivational but short).
- Performance: check bundle size, add proper caching, avoid unnecessary client components, add database indexes for the slowest queries.
- Consistent toast messages for every success and error.
- Add a /help page explaining the 7 phases and how to use the app.
- Lighthouse score target: 90+ for Performance, Accessibility, and Best Practices on /login and /dashboard.

List everything you changed.
```

---

## Handy "fix it" prompts

**When something breaks:**
```
I get this error: [paste full error]. This happens when I [what you did]. Here are the relevant files: [paste code]. Find the root cause, explain it briefly, and give the minimal fix.
```

**To add a feature safely:**
```
Add [feature] to the existing app. First list which files you will change and why. Do not rewrite unrelated code. Keep the same patterns (Zod validation, user scoping, shadcn/ui). Then show the code.
```

**To review your own code:**
```
Review this file for bugs, security problems, and performance issues. Be specific and show fixes: [paste code]
```
---

## Future ideas (after launch)

- AI coach that reads today's task and your notes and gives a short action plan (using the Claude API).
- Outreach message generator (DM / cold email templates) based on the business type.
- Public "build in public" progress page the user can share.
- Team or accountability-partner mode.
- Payment/invoice reminders for freelance businesses.
- Add more business templates beyond the 10 in the Excel (admin screen to create templates).
