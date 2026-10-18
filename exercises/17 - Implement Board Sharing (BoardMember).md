---
title: "Exercise 17 — Implement Board Sharing (BoardMember)"
description: Graded capstone — add a BoardMember model so a board can be shared with other users, end to end across the backend and the Angular frontend.
---

# Implement Board Sharing (BoardMember)

**Estimated time:** 3–4 hours
**Work mode:** Pairs

## Context

Every board currently belongs to exactly one person: `Board.owner`, set from
the JWT at creation and enforced by `BoardAccess`. That is deliberately the
whole model through day 3 — there is no `BoardMember` table, and
`requireBoardAccess` only ever asks "is this the owner, or an admin?"

This assessment asks you to finish what the project left open: let an owner share a
board with other users, who get real but limited access to it. You are
building on top of the existing ownership check, not replacing it — the
owner keeps every right they already have.

## Goal

Add a `BoardMember` model and wire it through the backend and the Angular
frontend so that:

- a board's **owner** can add and remove members by username;
- a **member** can open the board, see its columns, and create / edit / move
  / delete cards and columns, but cannot rename or delete the board, and
  cannot manage its membership;
- `GET /api/boards` returns a board to both its owner and its members;
- an **admin** keeps bypassing all of this, exactly as today.

## Required Behavior

Work from these as acceptance criteria — they are what will be checked, not
a suggested order of implementation.

### Backend

| # | Requirement |
|---|---|
| R1 | A new `BoardMember` entity/table records that a given username has `MEMBER` access to a given board. The board's owner is **not** stored as a row here — `Board.owner` already answers that question. |
| R2 | `POST /api/boards/{id}/members` adds a member. Body: `{ "username": "bob" }`. Only the board's owner (or an admin) may call it. |
| R3 | `GET /api/boards/{id}/members` lists a board's members. Callable by the owner, any existing member, or an admin. |
| R4 | `DELETE /api/boards/{id}/members/{username}` removes a member. Only the owner (or an admin) may call it, and it takes effect immediately — a removed member's next request is denied. |
| R5 | Adding a username that is already a member, or that is the board's own owner, is rejected with `400`, not silently accepted or duplicated. |
| R6 | `GET /api/boards` returns the caller's owned boards **and** the boards they are a member of (still every board, for an admin). |
| R7 | A member can read the board, its columns and its cards, and can create, edit, move, and delete columns and cards — the existing card/column endpoints should work for a member exactly as they do for the owner. |
| R8 | A member **cannot** rename or delete the board itself, and cannot call the membership endpoints (R2–R4) for a board they don't own. All three must come back `403`, not `404` or `500`. |
| R9 | Someone with no relationship to the board at all (not owner, not member, not admin) is still denied everywhere, exactly as before this change. |
| R10 | Removing an owner's own username, or having an owner try to add themselves, is rejected the same way as R5 — the owner relationship is never represented as a `BoardMember` row. |

### Frontend

| # | Requirement |
|---|---|
| F1 | The board list shows boards the signed-in user is a member of, not only boards they own. (Visually distinguishing "yours" from "shared with you" is encouraged but not required for credit.) |
| F2 | The board detail view has a members panel: the current members, visible to anyone who can open the board. |
| F3 | The owner sees controls to add a member (by username) and remove an existing one; a member does not see these controls. |
| F4 | A failed add/remove (e.g. R5's `400`, or a `403` for a non-owner who somehow reaches the UI) surfaces a readable error, following the existing `error` signal / message pattern already used elsewhere in `BoardDetailComponent`. |
| F5 | A non-owner member does not see (or see disabled) the "Delete" button that already exists for owners on the board list. |

## What You're Extending

Backend:
- `entity/`, `repository/`, `resource/BoardResource.java`, `security/BoardAccess.java`,
  `security/CurrentUser.java`

Frontend:
- `models/board.ts`, `services/board.service.ts`, `boards/board-list.component.ts`,
  `boards/board-detail.component.ts` (and its template)

You decide the exact shape of the new entity, repository and resource methods —
match the existing project's conventions (Jakarta Data derived queries over
hand-written JPQL, ownership checks centralized in `BoardAccess` rather than
duplicated per resource method, `ForbiddenException` for authorization
failures, signals + an `error` signal on the frontend).

## Test Accounts

Use `alice`, `bob` and `carol` (admin) from the `kanban` realm — see
`keycloak/README.md`. A natural manual test: as `alice`, create a board and
add `bob` as a member; confirm `bob` can open it and move a card, but a
`PUT /api/boards/{id}` rename attempt (there's no rename button in the UI)
and adding `carol` as a member both come back `403`; confirm `carol` (admin)
can do everything regardless.

## Submitting

Work in your own fork of this repository, not a branch on the shared repo —
a PR against the shared repo would be visible to every other pair. Submit by
opening a PR within your own fork (branch into your fork's default branch)
and sharing that PR's link. Don't merge it before it's been reviewed.

## Completion Check

Submit a branch or PR that includes:

- The `BoardMember` entity, repository, and the three new endpoints (R2–R4).
- The updated `BoardAccess` (and `BoardResource`/`CardResource`/
  `BoardListResource` as needed) enforcing R7–R10.
- The updated `GET /api/boards` behavior (R6).
- The frontend changes for F1–F5.
- A short write-up (half a page is enough) of:
  - how you distinguished "owner-only" actions from "any collaborator"
    actions in `BoardAccess`;
  - one authorization edge case you considered and how you handled it
    (e.g. a member trying to remove another member, or removing yourself as
    a member of a board you don't own).

## Out of Scope

- Changing who can create a board, or how ownership transfers.
- Real-time updates when a member is added/removed while someone else is
  viewing the board (no WebSocket needed here — a page reload is enough).
- Email/notification of any kind.
