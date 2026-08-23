# Phase 3 Document

## Goal

Phase 3 adds authentication and role-based access control on top of the Phase 2 database and frontend work.

## Delivered Scope

- JWT login and registration
- `GET /auth/me`
- password hashing
- admin and user roles
- protected expense and summary routes
- frontend session storage and logout
- seeded demo accounts for local testing

## What Changed In The App

- the browser now signs in before loading the dashboard
- every protected API request carries a bearer token
- the backend decodes the token and resolves the current user
- users can only see their own expenses
- admins can see all expenses

## Backend Pieces

- [`backend/app/core/security.py`](../backend/app/core/security.py) signs and verifies tokens
- [`backend/app/schemas/auth.py`](../backend/app/schemas/auth.py) defines user and token payloads
- [`backend/app/services/auth.py`](../backend/app/services/auth.py) handles login and register
- [`backend/app/routers/auth.py`](../backend/app/routers/auth.py) exposes the auth endpoints
- [`backend/app/deps.py`](../backend/app/deps.py) resolves the current user from the token
- [`backend/app/services/expense.py`](../backend/app/services/expense.py) applies RBAC checks

## Frontend Pieces

- [`frontend/app/page.tsx`](../frontend/app/page.tsx) manages login, register, logout, and dashboard state
- [`frontend/app/globals.css`](../frontend/app/globals.css) styles the session and auth cards

## Demo Accounts

- admin: `admin@example.com` / `Admin123!`
- user: `user@example.com` / `User123!`

## Acceptance Criteria

- a user can register and receive a token
- a user can log in and receive a token
- the frontend can load the dashboard only after sign-in
- regular users only see their own expenses
- admins can see the broader expense list
- `GET /auth/me` returns the current session user

## Manual Checks

- sign in with the seeded user account
- add an expense and verify the list refreshes
- edit the same expense and verify the summary updates
- sign in as admin and verify the list shows all rows
- try to open another user’s expense and verify the backend returns `403`

## Outcome

Phase 3 turns the app into a real multi-user system. The browser session, backend token checks, and database-backed users all work together so the app can support growth without changing the route surface again.

