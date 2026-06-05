# Server — Enhanced Library Management System

The `server/` package is the **Node.js + Express + Mongoose** REST API that powers the Enhanced Library Management System.

See the project root [`README.md`](../README.md) for the full system overview, tech stack, installation steps, API reference, and database schema. This file documents only what's specific to the server package.

---

## Local-only quick start

```bash
# from the repo root
cp server/.env.example server/.env
npm install
npm run dev:server      # or just: npm run dev
```

The API starts on http://localhost:5000 by default. Health check: `GET /api/health`.

## Scripts

| Script           | Description                                                  |
|------------------|--------------------------------------------------------------|
| `npm run dev`    | Start server with Nodemon (auto-reload on file change)       |
| `npm run start`  | Start server with plain `node server.js` (production)        |
| `npm run seed`   | Wipe and reseed the database with sample data                |

## Environment

See [`server/.env.example`](./.env.example) for the full template. The most important keys are:

| Key          | Purpose                                                                |
|--------------|------------------------------------------------------------------------|
| `PORT`       | Port the API listens on (default 5000)                                |
| `MONGO_URI`  | Full MongoDB connection string                                         |
| `JWT_SECRET` | Long random string for signing JWTs                                    |
| `EMAIL_*`    | SMTP credentials (optional — system works without email)              |
| `CLIENT_URL` | Allowed CORS origin                                                    |

## Folder map

```
server/
├── config/        # db.js (Mongoose connect), email.js (Nodemailer transporter)
├── controllers/   # 7 controllers — auth, book, category, member, transaction, user, report
├── middleware/    # auth (JWT verify), role, error, upload (multer, JPEG/PNG ≤ 2MB)
├── models/        # 6 Mongoose models — User, Book, Category, Member, Transaction, AuditLog
├── routes/        # 7 route files + audit
├── utils/         # generateToken, generateMemberID, generateAccessionNo, calcFine, pdfGenerator
├── jobs/          # overdueScheduler — node-cron @ 0 8 * * *
├── seed/          # seed.js (run via `npm run seed`)
├── uploads/       # file uploads land here (cover images, member photos)
├── .env
├── .env.example
└── server.js
```

## API surface

| Prefix                | Description                                                |
|-----------------------|------------------------------------------------------------|
| `/api/health`         | Liveness probe                                             |
| `/api/auth`           | Login, logout, forgot / reset password, me                 |
| `/api/books`          | CRUD on books, available, cover image upload               |
| `/api/categories`     | CRUD on categories                                         |
| `/api/members`        | CRUD on members, history, photo upload                     |
| `/api/transactions`   | Issue, return, renew, lost, list, overdue, by-member       |
| `/api/users`          | Admin-only — CRUD on staff users                           |
| `/api/reports`        | Admin-only — summary, charts, PDF exports                  |
| `/api/audit`          | Admin-only — paginated audit log                           |

Full request / response shapes: see [API Documentation](../README.md#9-api-documentation) in the root README.

## Authorization model

```
Request → authMiddleware (verify JWT) → roleMiddleware(['admin','librarian'])
       → controller
```

`req.user` is populated by `authMiddleware` and used by `roleMiddleware` to enforce role-based access. Controllers can read it via `req.user._id` and `req.user.role` for ownership checks and audit-log writes.

## Conventions

- All controllers are wrapped with `express-async-handler` so thrown errors flow to `errorMiddleware`.
- All IDs generated server-side are zero-padded strings: `ACC-000001`, `LIB-2026-00001`, `TXN-20260000001`.
- All money math goes through `utils/calcFine.js`.
- All file uploads land in `server/uploads/` via Multer with JPEG/PNG only and a 2 MB cap.
- Every create / update / delete should write an `AuditLog` entry.
- Soft delete only — never `.findByIdAndDelete()` a `Book` or `Member`.
