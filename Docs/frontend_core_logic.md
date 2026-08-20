# Frontend Core Logic

This app uses Next.js 15 with React 19 and TypeScript. The frontend is a single-page dashboard that:

- signs the user in
- stores a JWT in browser storage
- loads expenses and summary data from the FastAPI backend
- lets the user create and edit expenses
- shows summary cards and recent activity

## The Tech Stack

- `Next.js`: the app shell and page routing
- `React`: state, events, rendering
- `TypeScript`: typing the expense, summary, and auth data
- `CSS`: the visual theme and layout
- `fetch`: API calls to the backend

## Critical Files

- [`frontend/app/page.tsx`](../frontend/app/page.tsx): the main dashboard, login form, register form, and expense form logic
- [`frontend/app/globals.css`](../frontend/app/globals.css): layout, cards, buttons, responsive behavior, and auth styles
- [`frontend/app/layout.tsx`](../frontend/app/layout.tsx): page metadata and the root HTML shell
- [`frontend/lib/expense-utils.ts`](../frontend/lib/expense-utils.ts): client-side formatting and summary helpers
- [`frontend/tests/expense-utils.test.mjs`](../frontend/tests/expense-utils.test.mjs): quick checks for the helper logic

## How It Works

The page keeps three main pieces of state:

- the signed-in user and token
- the current expense list and summary
- the form state for login, register, and expense editing

When the page opens, it tries to read a saved session from browser storage. If the token is still valid, the page calls `GET /api/v1/auth/me` and then loads the dashboard data.

## Real Example

If a user signs in as `user@example.com`:

- the login form sends `POST /api/v1/auth/login`
- the backend returns a JWT and a user profile
- the frontend saves both in browser storage
- the dashboard fetches `GET /api/v1/expenses` and `GET /api/v1/stats/summary`
- the page renders totals, the latest expenses, and the edit form

If the user then edits an expense:

- clicking `Edit` copies that row into the form
- submitting the form sends `PATCH /api/v1/expenses/{id}`
- the dashboard reloads the list and summary so the cards stay in sync

## Where Each Part Is Used

- `page.tsx` handles user interaction and API calls
- `globals.css` makes the layout feel like a dashboard instead of a plain form
- `expense-utils.ts` keeps number formatting and summary calculations consistent
- `layout.tsx` sets the title and description for browser tabs and previews

## Why These Files Matter Most

- `page.tsx` is where the app decides whether the user is logged in
- `page.tsx` is also where JWTs are attached to requests
- `globals.css` controls the card-based layout and mobile stacking
- `expense-utils.ts` keeps the UI honest when the server is still loading

## What To Remember

- The frontend never talks to the database directly
- All real data changes go through the API
- The dashboard works best when the backend is running on the URL in `NEXT_PUBLIC_API_BASE_URL`
- The demo accounts make local sign-in easy during development

