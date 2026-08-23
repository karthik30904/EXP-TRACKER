# Codex Guide

This file captures the working rules for Codex on this repository.

## Rules

- Read `README.md` before making changes so the current phase is clear.
- Prefer small, targeted edits that match the existing architecture.
- Use `apply_patch` for file edits.
- Avoid destructive commands unless the user explicitly asks for them.
- Keep documentation and implementation in sync.
- Preserve the layered backend structure unless the user asks for a redesign.
- Update phase docs when the project phase changes.
- Verify a frontend production build and the relevant backend test command before marking a phase complete.
- Report environment blockers separately from application failures; do not mark an unrun test as passed.
- Keep `USE_DATABASE=false` as the safe local fallback and use migrations rather than creating schema in application startup.
- Do not commit local databases, server logs, dependency caches, or generated build output.
- Treat Phase 3 authentication as a cross-cutting change: update API, UI, database ownership, and tests together.
- Use absolute file paths when referring to repo files in responses.
- When in doubt, choose the simplest change that keeps the app moving forward.

## Skills

- Use `openai-docs` when the task is about Codex, OpenAI docs, settings, or app behavior.
- Use `documents` when producing or editing Word-style document artifacts.
- Use `pdf` when inspecting or generating PDFs.
- Use `spreadsheets` when creating or editing workbook-style files.
- Use `browser:control-in-app-browser` when the task needs the built-in browser UI.
- Use `plugin-management:plugin-management` when a plugin could materially improve the task.
- Use `imagegen` only for new raster visual assets, not for routine UI changes.
- Use `presentations` and `visualize` only when the requested deliverable is a deck or an interactive visualization.

## Repository Notes

- Phase 1 is the FastAPI backend with in-memory storage, CRUD, summary, request IDs, structured logs, and OpenAPI docs.
- Phase 2 supplies the SQLAlchemy/Alembic persistence path and Next.js dashboard; PostgreSQL deployment verification remains an operational task.
- Phase 3 adds auth and RBAC.
- Phase 4 adds the MCP server integration.

## Maintenance

- Keep this file short, current, and practical.
- If a new phase lands, update the phase docs and this guide together.
