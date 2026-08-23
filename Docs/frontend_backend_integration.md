# Frontend and Backend Integration

This document explains how the browser app talks to the FastAPI backend and what usually goes wrong when the connection is manual.

## Connection Path

- the browser loads `frontend/app/page.tsx`
- the page reads or writes state in React
- the page sends requests to `NEXT_PUBLIC_API_BASE_URL`
- FastAPI handles the request in `backend/app/routers/`
- services apply business rules
- repositories read or write storage

## The Main Rules

- every protected request sends `Authorization: Bearer <token>`
- the backend must allow the frontend origin through CORS
- the frontend must point at the correct API base URL
- the backend must be running before the dashboard can load data

## Real Example

When a signed-in user clicks `Save expense`:

- the page builds a JSON body
- the browser sends `POST /api/v1/expenses`
- the token is attached in the header
- the backend creates the row and returns the new expense
- the page reloads the list and summary cards

When a user logs out:

- the token is removed from browser storage
- the page clears the dashboard state
- the next request will fail until the user signs in again

## Manual Errors You Will See

- `401 Unauthorized`: the token is missing, expired, or invalid
- `403 Forbidden`: the token is valid, but the user is not allowed to access that expense
- `409 Conflict`: a registration email already exists
- `422 Unprocessable Entity`: the JSON body or date format is wrong
- `500 Internal Server Error`: something unexpected happened in the backend
- network errors: the backend URL is wrong or the server is not running
- CORS errors: the browser origin is not allowed by the backend

## How To Debug Fast

- check the browser network tab
- check the backend logs for the request id
- verify `NEXT_PUBLIC_API_BASE_URL`
- verify `CORS_ORIGINS`
- verify the token stored in browser storage
- verify the backend process is actually running

## Common Manual Mistakes

- sending the wrong content type
- forgetting the bearer token on protected routes
- using the wrong port for the backend
- signing in with the wrong demo password
- editing a row that belongs to another user
- leaving a stale token in browser storage after changing auth code

## Why This Integration Works

- the frontend keeps the UI responsive
- the backend keeps the rules authoritative
- the JWT keeps each request tied to a user
- the summary cards stay aligned because the dashboard reloads after each write

