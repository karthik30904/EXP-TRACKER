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
- Use absolute file paths when referring to repo files in responses.
- When in doubt, choose the simplest change that keeps the app moving forward.

## Skills

- Use `openai-docs` when the task is about Codex, OpenAI docs, settings, or app behavior.
- Use `documents` when producing or editing Word-style document artifacts.
- Use `pdf` when inspecting or generating PDFs.
- Use `spreadsheets` when creating or editing workbook-style files.
- Use `browser:control-in-app-browser` when the task needs the built-in browser UI.
- Use `plugin-management:plugin-management` when a plugin could materially improve the task.

## Repository Notes

- Phase 1 is the FastAPI backend with in-memory storage.
- Phase 2 is the database plus frontend phase.
- Phase 3 adds auth and RBAC.
- Phase 4 adds the MCP server integration.

## Maintenance

- Keep this file short, current, and practical.
- If a new phase lands, update the phase docs and this guide together.
