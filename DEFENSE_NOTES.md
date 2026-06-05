# Project Defense Notes

> A quick-reference Q&A for the final-year project defense session.
> **Project:** Enhanced Library Management System
> **Institution:** Delta State Polytechnic, Otefe-Oghara

This document captures the most likely panel questions and concise, technically grounded answers. Read through it once before the defense to refresh the "why" behind each major design decision.

---

## Q1. Why MongoDB for a library system?

A. Library records — especially books with varying metadata (editions, languages, multiple authors) and full transaction histories — benefit from MongoDB's flexible document model. Embedding transaction-like sub-documents avoids the complex joins a relational database would require, and that speeds up read operations for real-time availability checks like "how many copies of this book are available right now?"

Two specific reasons:

1. **Schema flexibility** — a book can have 0, 1, or many authors, optional ISBNs, multiple editions, and arbitrary descriptions. A relational schema would either require sparse columns or an `author` join table, both of which add friction.
2. **Document-level reads** — fetching a book with its current `availableCopies` count, its category, and its last 5 transactions is a single read in MongoDB. The same query in SQL would be a 3-table join with sorting.

We also use **Mongoose** as the ODM to get type validation, schema enforcement, hooks (e.g. password hashing on `User` save), and population (`ref: 'Book'`, `ref: 'Member'`).

---

## Q2. How does the fine calculation work?

A. The system stores a fine rate (NGN per day) in the **Settings** model. The formula is:

```
fineAmount = max(0, daysBetween(dueDate, returnDate)) × fineRatePerDay
```

- `dueDate` is stored on the `Transaction` model.
- `returnDate` is the actual return date if the book has been returned; otherwise we use **today's date** for the live calculation.
- The `max(0, …)` clamp ensures no negative fine is ever produced (a book returned early is free).

The calculation lives in `server/utils/calcFine.js` (and a mirrored version in `client/src/utils/calcFine.js` for live display). It runs:

- **Server-side** every time the overdue scheduler ticks (08:00) and on every return — so the stored `fineAmount` is always authoritative.
- **Client-side** for display only, so the librarian sees the live figure as they type.

**Example:** at `50 NGN/day`, a book 5 days overdue = `5 × 50 = NGN 250`.

---

## Q3. How do you prevent a member from borrowing beyond their limit?

A. Before issuing a book, the transaction controller:

1. Loads the `Member` document.
2. Verifies the member is **active** (`isActive === true`).
3. Verifies the membership is **not expired** (`membershipEnd >= today`).
4. Counts the member's active transactions: `Transaction.countDocuments({ member, status: { $in: ['Issued', 'Overdue'] } })`.
5. Compares that count to `member.maxBooksAllowed` (default 3).
6. Verifies the member has no unpaid fines (`Transaction.countDocuments({ member, finePaid: false, fineAmount: { $gt: 0 } }) === 0`).
7. Verifies the book has at least 1 `availableCopies` left.

If any of these checks fail, the controller returns a `400` error with a specific message — `"Member has reached their maximum borrowing limit"`, `"Membership Expired"`, `"Outstanding fine: NGN 250"`, or `"No copies available"`. The frontend displays that message in a toast and aborts the request.

This means the limit is enforced by the server, not just the UI, so a malicious client cannot bypass it by hand-crafting an API call.

---

## Q4. What happens when a book is marked as Lost?

A. Marking a book as lost is a deliberate, multi-step process that the system handles as follows:

1. The user clicks **Mark Lost** on a transaction in the Transactions or Overdue list.
2. A confirm dialog appears to prevent accidents.
3. On confirm, the API updates the transaction: `status = "Lost"`.
4. Critically, the book's `availableCopies` is **NOT** incremented back, because the physical copy is gone — the library cannot lend what it no longer has.
5. An `AuditLog` entry is written capturing the user, the transaction, the timestamp, and the IP.
6. The admin can later manually edit the book's `totalCopies` and `availableCopies` to reflect the permanent loss.

This is the opposite of "return", which sets `status = "Returned"`, sets `returnDate = today`, and **does** increment `availableCopies` back.

---

## Q5. How does role-based access work in your system?

A. Three roles exist: **Admin**, **Librarian**, and **Member**. The system enforces RBAC at three layers:

1. **Login** — on `POST /api/auth/login`, the JWT payload includes `{ id, role, email }`. The role is also returned in the response so the client knows where to redirect.
2. **Backend** — every protected route passes through `authMiddleware` (which decodes the JWT and attaches `req.user`) followed by `roleMiddleware(['admin', 'librarian'])` (or whatever roles are allowed). If the user's role is not in the allowed list, the API returns `403 Forbidden`.
3. **Frontend** — `<RoleRoute allow={['admin', 'librarian']}>` wraps role-restricted pages. The sidebar menu items themselves are filtered by role: a Member never sees "Users" or "Audit Logs", for example.

This is **defense in depth**: even if the frontend route guard is bypassed, the backend still refuses the request.

The full role-permission matrix is in the root [`README.md`](./README.md#11-role-and-permission-matrix).

---

## Q6. Why did you add a Member portal (Member role)?

A. In a real library, members frequently want to check three things: what they currently have borrowed, when each book is due, and what fines (if any) they owe. Without a self-service portal, every one of these questions requires either a phone call to the library desk, an in-person visit, or a quick check of the public catalogue. That creates friction for members and piles routine work onto library staff.

The Member portal — accessible at `/my-books`, `/my-history`, and `/profile` — provides that self-service view. It also reflects how modern library systems (e.g. OPACs, Koha, Alma) actually operate: members authenticate against the catalogue and view their own records.

The portal **does not** let members issue, return, or renew books — those are restricted to staff — so the integrity of the lending workflow is preserved.

---

## Q7. What is an audit log and why does a library system need one?

A. An audit log is a chronological record of every significant system action — who issued a book, who deactivated a member, who changed the fine rate — with the acting user's ID, the affected entity, an IP address, and a timestamp. In a library context, the audit log serves three concrete purposes:

1. **Accountability** — if a book goes missing from the catalogue, the log shows who added it, who last modified it, who marked it lost, and when.
2. **Investigation** — discrepancies (e.g. a member claiming they returned a book but the system still shows it as issued) can be resolved by looking at the transaction history.
3. **Institutional review** — the polytechnic's audit committee, the librarian in charge, and external reviewers can all see the system was operated transparently and consistently.

In our implementation, the `AuditLog` model (`server/models/AuditLog.js`) captures `performedBy`, `action`, `targetModel`, `targetId`, `details`, `ipAddress`, and `timestamp`. It is exposed at `GET /api/audit` (Admin only) and rendered in the **Audit Logs** page with filters by user, action, and date range.

---

## Q8. How does the automated overdue notification work?

A. Two mechanisms run in parallel, both implemented in `server/jobs/overdueScheduler.js` and used by the Overdue list controller.

**1. Real-time check (on-demand).** Every time the **Overdue list** page or the **Dashboard** is loaded, the controller runs an immediate update:

```js
Transaction.updateMany(
  { status: "Issued", dueDate: { $lt: new Date() } },
  { $set: { status: "Overdue", fineAmount: /* recalculated */ } }
);
```

This keeps the UI accurate without waiting for a scheduled tick.

**2. Scheduled job (`node-cron`, daily at 08:00).** The server registers a `cron.schedule("0 8 * * *", ...)` on startup. When it fires, it:

1. Runs the same overdue update as above.
2. Sends an individual reminder email to each affected member (subject: `"Library Overdue Notice — [Book Title]"`, body: member name, book title, issue date, due date, days overdue, fine amount).
3. Sends a consolidated summary email to the admin listing all overdue transactions.

This combination ensures members are notified even if they never log into the portal, while staff get a single daily digest to act on.

---

## Q9. How do you handle membership expiry?

A. Three places in the system know about membership expiry:

1. **The data model** — `Member.membershipEnd` is a `Date` set to one year from `membershipStart` on registration.
2. **The issue controller** — before issuing a book, it checks `membershipEnd < today` and rejects the request with `"Member's library membership has expired. Please renew."`. This is a hard block, not just a warning.
3. **The expiry-warning cron** — a separate scheduled job runs daily and queries `Member.find({ membershipEnd: { $lte: sevenDaysFromNow, $gte: today } })` to send a 7-day warning email to members whose membership is about to lapse.

Renewal is handled in the **Member Profile** page — an admin can extend `membershipEnd` by another year (or whatever the configured `membershipValidityMonths` is in Settings). The system does **not** auto-renew; it must be an explicit, audited action by a staff member.

---

## Q10. Why limit renewals to a maximum of 2?

A. Unlimited renewals would let a single member hold a popular book indefinitely — by renewing it the moment it's due, they could keep it for the entire academic year. That would deny access to the other members who want to read or reference the same book and would distort the circulation statistics the library uses to make acquisition decisions.

The **2-renewal cap** (configurable in Settings, default 2) is the standard policy used in most academic libraries. After 2 renewals, the member must return the book in person; they can then re-borrow it, which puts it back in the active lending pool for a short window and gives other members a fair shot at it.

The cap is enforced inside the renew controller: if `transaction.renewalCount >= settings.maxRenewals`, the request is rejected with a clear error. The renewal button on the UI is also disabled when the cap is reached, so the user sees the state before they click.

---

## General talking points (use as needed)

- **Why a monorepo?** The client and server are tightly coupled (same domain, same schema, same auth) and a single developer (you) is working on both. A monorepo with `npm workspaces` lets one `npm install` set up everything, and `concurrently` runs both dev servers from one terminal. It also keeps the README, documentation, and defense notes in one place.
- **Why React + Vite and not Next.js?** The app is a CRUD dashboard, not a content site — server-side rendering would add complexity for no benefit. Vite gives near-instant HMR and a tiny config surface.
- **Why Tailwind and not a component library?** The brand palette is highly specific (navy + gold) and the prompt defines exact color rules. Tailwind's `theme.extend.colors` lets us codify that palette once and use it everywhere with `bg-primary`, `text-accent`, etc.
- **Why a Member role at all?** See Q6 — it's standard in modern OPACs and reduces staff workload.
- **Why a single Settings model and not per-feature configs?** Centralized settings (library name, fine rate, max books, loan period, max renewals, membership validity) are easier to change and audit than scattered config files or environment variables.
- **Why soft delete and not hard delete?** Books and members are referenced by historical transactions. Hard-deleting a book would orphan its transaction history. Setting `isActive = false` keeps the history intact while removing the entity from new-issue dropdowns.

---

**Good luck with your defense!** Remember: the panel cares more about *why* you made each decision than *what* each function does. Use this document as a refresher, not a script.
