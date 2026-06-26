# Leaders Court Academy - Implementation Roadmap

## Completed Phases
- [x] UI/UX Design System
- [x] Cinematic Landing Page
- [x] Dashboard Layout & Navigation
- [x] Course Catalog & Player UI
- [x] Checkout Flow Mockup
- [x] Settings & Certifications UI

## Remaining Implementation Phases

### [x] Phase 1: Database & Authentication (Supabase)
* **Goal**: Establish the user identity and data persistence layer.
* **Tasks**: Create Supabase project, configure email/password auth, set up PostgreSQL tables for `users` and `enrollments` (including the `expires_at` logic for 6-month access).

### [x] Phase 2: Content Management & Video (Sanity + Mux)
* **Goal**: Separate content from code and deliver HLS adaptive video.
* **Tasks**: Initialize Sanity Studio locally, deploy to Sanity Cloud, create schemas (Courses, Modules, Quizzes), and configure the Mux video plugin for secure streaming.

### [x] Phase 3: Application Integration (Vite/React + SDKs)
* **Goal**: Connect the beautiful UI we built to the real data sources.
* **Tasks**: Install Supabase & Sanity SDKs in our codebase, replace mock data with live GROQ queries, and implement protected routes tied to real user sessions.

### Phase 4: Payment Gateway & Webhooks (Paystack)
* **Goal**: Process NGN/USD transactions and automate course access.
* **Tasks**: Set up Paystack API keys, build backend webhook listeners (using Express/Next.js/Edge functions) to listen for `charge.success`, and programmatically insert a 6-month enrollment record into Supabase upon payment.

### Phase 5: Domain & Deployment (Vercel)
* **Goal**: Go live on `academy.leaderscourt.com`.
* **Tasks**: Deploy frontend/backend to Vercel, attach the custom domain, ensure SSL certificates are active, and test the end-to-end flow.
