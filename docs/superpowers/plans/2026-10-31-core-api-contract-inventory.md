# Core API Contract Inventory Implementation Plan

> **For agentic workers:** Execute inline in this session; keep the task documentation-only and preserve all existing worktree changes.

**Goal:** Record the current Core HTTP surface, consumers, and server-side authorization exactly as implemented so later compatibility work does not guess.

**Architecture:** Derive the inventory from NestJS controllers and DTO declarations. Mark response shapes that are service-derived or not statically declared as requiring runtime contract capture; do not infer or alter their schemas.

**Tech Stack:** NestJS controllers, TypeScript DTOs, Markdown documentation.

## Global Constraints

- Do not modify business code, database files, environment files, or API paths.
- Preserve the modified `data/danke.db` and all existing Core worktree changes.
- Do not run database, migration, build, or seed commands.

---

### Task 1: Add the source-verified endpoint inventory

**Files:**
- Create: `docs/api-contracts.md`
- Read: `src/**/*.controller.ts`, `src/**/dto/*.ts`

**Interfaces:**
- The document records method, URL, parameters, request DTO or body fields, response knowledge, server permission, and known consumers.
- Consumer usage is only asserted where repository call sites were verified; otherwise mark it unconfirmed.

- [x] Read controller route decorators and guard metadata.
- [x] Record all current endpoint aliases and compatibility routes.
- [x] Mark response formats that need capture before standardization.
- [x] Review the document against controller sources and `git diff --check`.

**Acceptance:** Every route currently declared in the inspected controllers appears in the inventory; no API or data file is changed.

**Rollback:** Delete only `docs/api-contracts.md` and this plan file.
