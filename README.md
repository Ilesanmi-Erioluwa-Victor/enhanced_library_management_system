# Enhanced Library Management System

> **Academic Final Year Project** — Department of Computer Science, Delta State Polytechnic, Otefe-Oghara, Delta State, Nigeria.

A full-stack web-based library management system that lets librarians add, update, search, issue, and return books while maintaining records of library members and transactions. The system generates reports on book availability, borrowing history, and overdue books, and includes a self-service portal for library members to view their own borrowed books and history.

---

## Table of Contents

1. [Project Title and Abstract](#1-project-title-and-abstract)
2. [Tech Stack](#2-tech-stack)
3. [System Requirements](#3-system-requirements)
4. [Installation Guide](#4-installation-guide)
5. [Running the Application](#5-running-the-application)
6. [Default Seed Credentials](#6-default-seed-credentials)
7. [User Manual — How to Use the System](#7-user-manual--how-to-use-the-system)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [API Documentation](#9-api-documentation)
10. [Database Schema](#10-database-schema)
11. [Role and Permission Matrix](#11-role-and-permission-matrix)
12. [Fine Calculation Logic](#12-fine-calculation-logic)
13. [Automated Overdue System](#13-automated-overdue-system)
14. [Security Features](#14-security-features)
15. [Color Palette and Design System](#15-color-palette-and-design-system)
16. [Business Rules and Edge Cases](#16-business-rules-and-edge-cases)
17. [Known Limitations](#17-known-limitations)
18. [Future Improvements](#18-future-improvements)
19. [Project Structure](#19-project-structure)
20. [References](#20-references)

---

## 1. Project Title and Abstract

**Title:** Enhanced Library Management System

**Abstract:** The Enhanced Library Management System (ELMS) is a web-based application designed to digitize and streamline the day-to-day operations of a polytechnic library. The system replaces manual paper-based record keeping with a centralized database that tracks books, members, and the full lifecycle of borrowing transactions — from issue to return, including renewals, fines, and lost-book handling. It supports three user roles (Admin, Librarian, and Member), enforces library lending rules automatically, calculates overdue fines, sends email notifications for overdue and membership-expiry events, generates a daily overdue report at 08:00 via a scheduled job, and exports reports as PDF documents. The Member portal allows library users to view their own borrowed books, due dates, and borrowing history without needing to call or visit the library desk, reducing the workload on library staff and improving user experience.

The application is built as a single-codebase monorepo with two packages:

- **`client/`** — a React 18 + Vite single-page application styled with Tailwind CSS
- **`server/`** — a Node.js + Express REST API backed by MongoDB and Mongoose

The two packages share a root `package.json` and are run together with a single `npm run dev` command.

---

## 2. Tech Stack

| Layer         | Technology                                  | Purpose                                                              |
|---------------|---------------------------------------------|----------------------------------------------------------------------|
| Frontend      | **React 18** (Vite)                         | Component-based SPA                                                  |
| Styling       | **Tailwind CSS 3**                          | Utility-first CSS with a custom brand palette                        |
| Routing       | **react-router-dom v6**                     | Client-side routing with role-based protection                       |
| HTTP          | **Axios**                                   | API client with auth + 401 interceptors                              |
| Forms         | **react-hook-form**                         | Performant form state and validation                                |
| Charts        | **recharts**                                | Dashboard analytics (bar / pie charts)                               |
| Date pickers  | **react-datepicker**                        | Due-date and date-range pickers                                      |
| Icons         | **@heroicons/react**                        | UI iconography                                                       |
| Toasts        | **react-hot-toast**                         | Success / error feedback on every async action                      |
| Backend       | **Node.js 18+** + **Express 4**             | REST API server                                                      |
| Database      | **MongoDB 6+** + **Mongoose 8**             | Document store with ODM                                              |
| Auth          | **JWT** (jsonwebtoken) + **bcryptjs**       | Stateless authentication with hashed passwords                       |
| File uploads  | **Multer**                                  | Book cover and member photo uploads (JPEG/PNG, max 2 MB)             |
| Email         | **Nodemailer** (SMTP)                       | Welcome, issue, overdue, expiry, password-reset emails               |
| PDF           | **pdfkit**                                  | Receipts, member cards, catalogue and report exports                 |
| Scheduling    | **node-cron**                               | Daily 08:00 overdue check + email notifications                      |
| Logging       | **morgan**                                  | HTTP request logs in dev/prod                                        |
| Dev tooling   | **nodemon** (server), **Vite HMR** (client) | Auto-reload during development                                       |
| Orchestration | **npm workspaces** + **concurrently**       | Single-command dev startup for both packages                         |

---

## 3. System Requirements

Make sure the following are installed on the development machine before proceeding:

| Requirement | Version            | Notes                                                              |
|-------------|--------------------|--------------------------------------------------------------------|
| Node.js     | **>= 18.0.0**      | `node -v` to check. Download from https://nodejs.org               |
| npm         | **>= 9.0.0**       | Bundled with Node 18+. `npm -v` to check                           |
| MongoDB     | **>= 6.0**         | Local install or free Atlas cluster. `mongod --version` to check   |
| Git         | latest             | For version control                                                |
| OS          | macOS / Linux / Windows (WSL2 recommended) | All scripts are cross-platform                  |

A modern browser (Chrome, Firefox, Edge, Safari) is required to use the web app.

---

## 4. Installation Guide

### 4.1. Clone the repository

```bash
git clone <your-repo-url> enhanced_library_management_system
cd enhanced_library_management_system
```

### 4.2. Install all dependencies (root, client, and server)

Because the project uses **npm workspaces**, a single `npm install` at the root installs the dependencies for every package and links the workspaces together.

```bash
npm install
```

This creates `node_modules/` at the root and hoists shared packages. Both `client/node_modules` and `server/node_modules` are populated automatically.

### 4.3. Configure the server environment

```bash
cp server/.env.example server/.env
```

Open `server/.env` in any text editor and update the values:

- `MONGO_URI` — your local MongoDB URI (default works for a local install: `mongodb://localhost:27017/library_management_db`)
- `JWT_SECRET` — replace with a long, random string
- `EMAIL_*` — your SMTP credentials (Gmail app password, etc.) if you want email notifications to work
- `LIBRARY_NAME`, `LIBRARY_ADDRESS`, `LIBRARY_PHONE` — used in PDF headers and email footers
- `CLIENT_URL` — the URL the client is served from (default `http://localhost:5173`)

> **Never commit `server/.env`** — it is already in `.gitignore`.

### 4.4. Set up MongoDB

The app works with either a **local MongoDB** or **MongoDB Atlas** (free cloud cluster). Pick one.

#### Option A — Local MongoDB

If you installed MongoDB as a service, it likely already runs on `mongodb://localhost:27017`. To start it manually:

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Windows
net start MongoDB
```

Then in `server/.env`, set:

```
MONGO_URI=mongodb://localhost:27017/library_management_db
```

#### Option B — MongoDB Atlas (free cloud cluster)

1. Sign up at https://www.mongodb.com/atlas (free tier is enough).
2. Create a free **M0 cluster** in a region close to you.
3. **Database Access** → add a database user with a username and a password. **Remember both.**
4. **Network Access** → add your current IP. For local dev only, you can choose `Add Current IP Address` or, less securely, `Allow Access from Anywhere` (`0.0.0.0/0`).
5. **Database** → **Connect** → **Drivers** → copy the connection string. It looks like:

   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

6. Edit `server/.env` and set:

   ```
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/library_management_db?retryWrites=true&w=majority
   ```

   - Replace `<username>` and `<password>` with the database user from step 3.
   - If your password contains special characters (`@`, `#`, `:`, `/`, etc.), URL-encode them (e.g. `@` → `%40`).
   - Note the database name `library_management_db` is appended before the query string. This is the database the seed will populate.

7. From the repo root, run the seed (see 4.5 below). If the connection string is correct, the seed prints `[db] MongoDB connected: <host>` and inserts the users, categories, books, members, and transactions.

### 4.5. (Optional) Seed the database with sample data

The seed script populates the database with:

- 2 users (1 admin, 1 librarian)
- 6 categories
- 10 books across all categories
- 5 members (including 1 with an expired membership)
- 5 transactions (2 Issued, 1 Returned, 1 Overdue, 1 Renewed)

```bash
npm run seed
```

If you skip this step, the system starts with an empty database and you can register everything manually from the UI.

### 4.6. Configure the client (optional)

The client reads `VITE_API_URL` from `client/.env`. The default value (`http://localhost:5000/api`) works out of the box. You only need to change it if you are running the server on a different host/port.

---

## 5. Running the Application

### 5.1. Development mode (both client and server, auto-reload)

```bash
npm run dev
```

This uses `concurrently` to start both workspaces in the same terminal with color-coded output:

- **Server** (Nodemon) — http://localhost:5000
- **Client** (Vite dev server) — http://localhost:5173

Open http://localhost:5173 in your browser to use the app.

### 5.2. Run packages individually

If you only want to work on one side:

```bash
npm run dev:server   # Express + Nodemon on :5000
npm run dev:client   # Vite on :5173
```

### 5.3. Production build

```bash
# 1. Build the client (outputs to client/dist/)
npm run build

# 2. Start the server (which can also serve client/dist in production)
npm run start
```

### 5.4. Resetting the database

```bash
npm run seed    # clears and re-seeds — destructive
```

---

## 6. Default Seed Credentials

After running `npm run seed`, the following accounts exist:

| Role      | Email                   | Password   |
|-----------|-------------------------|------------|
| Admin     | `admin@library.com`     | `Admin@1234` |
| Librarian | `librarian@library.com` | `Lib@1234`   |

> **Important:** Change these passwords immediately in any non-development environment.

---

## 7. User Manual — How to Use the System

The system supports three roles. After logging in, the sidebar and the dashboard adapt to the active role.

### 7.1. Logging in

1. Navigate to http://localhost:5173/login.
2. Enter your email and password.
3. Click **Sign in**. You are redirected to your role-appropriate home:
   - Admin / Librarian → `/dashboard`
   - Member → `/my-books`

Click **Show** next to the password field to reveal the password. Click **Forgot Password?** to receive a reset link by email.

### 7.2. Admin guide

Admins have full access to the system.

**Common tasks:**

- **Add a librarian or another admin** → Sidebar → Users → Add New User.
- **Add a book category** → Sidebar → Settings → Categories (or via the API).
- **Configure loan period, fine rate, max books, max renewals, membership validity** → Sidebar → Settings.
- **Generate reports** → Sidebar → Reports → choose Books / Members / Overdue / Transactions, then click the corresponding **Export PDF** button.
- **Investigate an issue** → Sidebar → Audit Logs → filter by user, action, or date.
- **Manage librarians** → Sidebar → Users → toggle Active/Inactive to revoke access.

### 7.3. Librarian guide

Librarians handle the day-to-day library operations.

**Common tasks:**

- **Add a new book** → Sidebar → Add Book → fill the form → Submit. The system auto-generates the accession number (`ACC-000001`, `ACC-000002`, …).
- **Search the catalogue** → Sidebar → Books → use the search bar to filter by title, author, ISBN, or accession number.
- **Register a new member** → Sidebar → Register Member → walk the 3-step wizard. The system auto-generates the Member ID (`LIB-2026-00001`, …), sets membership expiry to today + 1 year, and sends a welcome email.
- **Issue a book** → Sidebar → Issue Book → search for the member, then the book → confirm the due date (default: today + 14 days) → Issue. A transaction code (`TXN-20260000001`, …) is generated.
- **Return a book** → Sidebar → Return Book → search by Transaction Code or by Member ID + Accession Number → the system auto-calculates any overdue fine → tick "Mark Fine as Paid" if collected → Confirm.
- **Renew a book** → Sidebar → Transactions → click Renew on a row. The due date is extended by 14 days (max 2 renewals per transaction).
- **Mark a book as lost** → Sidebar → Transactions → Mark Lost. The available copy count is **not** incremented back, and an audit log entry is written.
- **Process overdue** → Sidebar → Overdue → filter, send individual reminder emails, or click **Send All Reminders** to email everyone in the list.

### 7.4. Member guide

Members are library patrons with a self-service portal.

**Common tasks:**

- **View currently borrowed books** → Sidebar → My Books. Each card shows the book, due date, and an Overdue badge if applicable.
- **View borrowing history** → Sidebar → My History.
- **Update profile** → Sidebar → Profile → edit name / phone / photo / password.

Members cannot issue, return, or renew books themselves — they must visit the library desk for those operations.

### 7.5. Common UI behaviors

- **Search debounce** — every search field waits 400 ms after the last keystroke before firing the request.
- **Pagination** — every list view shows 10 records per page; use the **Previous** / **Next** buttons at the bottom.
- **Dates** — all dates are displayed in `DD/MM/YYYY` format.
- **Currency** — all monetary amounts are in Nigerian Naira (`NGN 1,250`).
- **Color coding** — overdue rows have a light-red background, issued rows a light-cyan tint, returned rows a light-green tint.

---

## 8. Environment Variables Reference

### 8.1. `server/.env` keys

| Key                | Required | Default                                          | Description                                                                 |
|--------------------|----------|--------------------------------------------------|-----------------------------------------------------------------------------|
| `PORT`             | No       | `5000`                                           | Port the Express server listens on                                          |
| `NODE_ENV`         | No       | `development`                                    | Set to `production` in deployment                                            |
| `MONGO_URI`        | **Yes**  | `mongodb://localhost:27017/library_management_db`| Full MongoDB connection string                                              |
| `JWT_SECRET`       | **Yes**  | —                                                | Long random string used to sign JWTs                                         |
| `JWT_EXPIRES_IN`   | No       | `8h`                                             | Token lifetime (e.g. `8h`, `1d`)                                            |
| `EMAIL_HOST`       | No*      | —                                                | SMTP host (e.g. `smtp.gmail.com`)                                            |
| `EMAIL_PORT`       | No*      | `587`                                            | SMTP port (use `465` for SMTPS)                                              |
| `EMAIL_USER`       | No*      | —                                                | SMTP username                                                               |
| `EMAIL_PASS`       | No*      | —                                                | SMTP password / app password                                                 |
| `EMAIL_FROM`       | No*      | `LibrarySystem <noreply@library.local>`          | "From" address shown to recipients                                           |
| `CLIENT_URL`       | No       | `http://localhost:5173`                          | Used by CORS and password-reset email links                                  |
| `LIBRARY_NAME`     | No       | `Delta State Polytechnic Library`                | Displayed in PDF headers and email templates                                 |
| `LIBRARY_ADDRESS`  | No       | `Otefe-Oghara, Delta State, Nigeria`             | Displayed in PDF headers                                                    |
| `LIBRARY_PHONE`    | No       | `+234 800 000 0000`                              | Displayed in PDF headers                                                    |

\* Required for email notifications to work. If any of `EMAIL_USER` / `EMAIL_PASS` is missing, the system logs a warning and silently skips sending (no crash).

### 8.2. `client/.env` keys

| Key             | Required | Default                       | Description                                          |
|-----------------|----------|-------------------------------|------------------------------------------------------|
| `VITE_API_URL`  | No       | `http://localhost:5000/api`   | Base URL for all API calls                           |

---

## 9. API Documentation

All endpoints are prefixed with `/api`. Authenticated endpoints require a `Bearer <token>` header (the token is returned by `POST /api/auth/login`).

### 9.1. Auth — `/api/auth`

| Method | Path                          | Auth         | Description                                |
|--------|-------------------------------|--------------|--------------------------------------------|
| POST   | `/login`                      | Public       | Email + password → JWT + user profile      |
| POST   | `/logout`                     | Bearer       | Server-side logout (no-op in this stub)    |
| POST   | `/forgot-password`            | Public       | Email → reset link                         |
| POST   | `/reset-password/:token`      | Public       | Token + new password → reset               |
| GET    | `/me`                         | Bearer       | Returns the currently logged-in user       |

**Sample login request:**

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@library.com", "password": "Admin@1234" }
```

**Sample login response:**

```json
{
  "_id": "652f0a...",
  "fullName": "System Admin",
  "email": "admin@library.com",
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 9.2. Books — `/api/books`

| Method | Path                | Roles                  | Description                                  |
|--------|---------------------|------------------------|----------------------------------------------|
| GET    | `/`                 | Any logged-in          | Paginated, searchable, filterable list       |
| GET    | `/available`        | Any logged-in          | All books with `availableCopies > 0`         |
| GET    | `/:id`              | Any logged-in          | Single book details                          |
| POST   | `/`                 | Admin, Librarian       | Add a new book                               |
| PUT    | `/:id`              | Admin, Librarian       | Update an existing book                      |
| DELETE | `/:id`              | Admin                  | Soft delete (sets `isActive = false`)        |
| POST   | `/:id/cover`        | Admin, Librarian       | Upload cover image (multipart, JPEG/PNG)     |

**Sample book payload (POST /):**

```json
{
  "title": "Introduction to Algorithms",
  "author": "Cormen et al.",
  "isbn": "9780262033848",
  "category": "<categoryId>",
  "publisher": "MIT Press",
  "yearPublished": 2009,
  "edition": "3rd",
  "totalCopies": 5,
  "shelfLocation": "A1-Shelf1",
  "language": "English",
  "description": "..."
}
```

### 9.3. Categories — `/api/categories`

| Method | Path     | Roles   | Description                                          |
|--------|----------|---------|------------------------------------------------------|
| GET    | `/`      | Any     | List all categories                                  |
| POST   | `/`      | Admin   | Create a category                                    |
| PUT    | `/:id`   | Admin   | Update a category                                    |
| DELETE | `/:id`   | Admin   | Delete (only if no books are assigned to it)         |

### 9.4. Members — `/api/members`

| Method | Path                | Roles                  | Description                                       |
|--------|---------------------|------------------------|---------------------------------------------------|
| GET    | `/`                 | Admin, Librarian       | Paginated list with search                        |
| POST   | `/`                 | Admin, Librarian       | Register a new member                             |
| GET    | `/:id`              | Any logged-in          | Member details + borrowing summary                |
| PUT    | `/:id`              | Admin, Librarian       | Update member details                             |
| DELETE | `/:id`              | Admin                  | Deactivate (sets `isActive = false`)              |
| POST   | `/:id/photo`        | Admin, Librarian       | Upload member photo (multipart, JPEG/PNG)         |
| GET    | `/:id/history`      | Any logged-in          | Full borrowing history for the member             |

### 9.5. Transactions — `/api/transactions`

| Method | Path                  | Roles                  | Description                                       |
|--------|-----------------------|------------------------|---------------------------------------------------|
| POST   | `/issue`              | Admin, Librarian       | Issue a book to a member                          |
| POST   | `/return`             | Admin, Librarian       | Return a book (by TXN code, or member+accession)  |
| POST   | `/renew/:id`          | Admin, Librarian       | Renew (extends due date by 14 days; max 2 times)  |
| POST   | `/lost/:id`           | Admin, Librarian       | Mark a transaction as Lost                        |
| GET    | `/`                   | Any logged-in          | Paginated, filterable list                        |
| GET    | `/overdue`            | Any logged-in          | All currently overdue transactions                |
| GET    | `/:id`                | Any logged-in          | Single transaction details                        |
| GET    | `/member/:memberId`   | Any logged-in          | All transactions for a specific member            |

**Sample issue request:**

```json
POST /api/transactions/issue
{
  "memberId": "<memberId>",
  "bookId":   "<bookId>",
  "dueDate":  "2026-06-20T00:00:00.000Z",
  "notes":    "First-time borrower"
}
```

### 9.6. Users — `/api/users` (Admin only)

| Method | Path        | Description                                |
|--------|-------------|--------------------------------------------|
| GET    | `/`         | List all staff users                       |
| POST   | `/`         | Create a new staff user                    |
| GET    | `/:id`      | Single user details                        |
| PUT    | `/:id`      | Update user (or toggle `isActive`)         |
| DELETE | `/:id`      | Deactivate (sets `isActive = false`)       |

### 9.7. Reports — `/api/reports` (Admin only)

| Method | Path                       | Description                                          |
|--------|----------------------------|------------------------------------------------------|
| GET    | `/summary`                 | Totals: books, copies, members, issues, overdue      |
| GET    | `/books-by-category`       | Book count grouped by category (pie chart)           |
| GET    | `/top-borrowed`            | Top 10 most-borrowed books                           |
| GET    | `/member-activity`         | Most active borrowers                                |
| GET    | `/overdue-summary`         | Overdue breakdown by member type                     |
| GET    | `/monthly-issues`          | Issues vs returns per month (last 12 months)         |
| GET    | `/export/books`            | Full book catalogue as PDF                           |
| GET    | `/export/members`          | Member list as PDF                                   |
| GET    | `/export/overdue`          | Overdue report as PDF                                |
| GET    | `/export/transactions`     | Transaction history as PDF (with date range)         |

### 9.8. Audit — `/api/audit` (Admin only)

| Method | Path  | Description                                                       |
|--------|-------|-------------------------------------------------------------------|
| GET    | `/`   | Paginated audit log; filter by user, action, target, date range   |

### 9.9. Standard error format

All errors return JSON in the following shape:

```json
{ "message": "Member has reached their maximum borrowing limit." }
```

The HTTP status code carries the meaning: `400` for validation, `401` for missing/invalid auth, `403` for insufficient role, `404` for not found, `409` for conflicts (e.g. duplicate email), `500` for server errors.

---

## 10. Database Schema

The application uses six Mongoose models.

### 10.1. Entity-relationship overview

```
User ───────┐
            │ createdBy / addedBy / registeredBy / issuedBy
            ▼
Category ──── Book ──── Transaction ──── Member
                              ▲
                              │
                          AuditLog (performedBy → User)
```

### 10.2. User

| Field          | Type     | Notes                                              |
|----------------|----------|----------------------------------------------------|
| `fullName`     | String   | required                                           |
| `email`        | String   | required, unique, indexed                          |
| `password`     | String   | required, bcrypt-hashed (saltRounds 10)            |
| `role`         | String   | enum: `admin`, `librarian`                         |
| `phone`        | String   | optional                                           |
| `isActive`     | Boolean  | default `true`; deactivation = soft delete         |
| `profileImage` | String   | file path                                          |
| `timestamps`   | —        | `createdAt`, `updatedAt`                           |

### 10.3. Category

| Field        | Type   | Notes                       |
|--------------|--------|-----------------------------|
| `name`       | String | required, unique            |
| `description`| String | optional                    |
| `createdBy`  | ObjectId → User |              |
| `timestamps` | —      |                             |

### 10.4. Book

| Field             | Type                | Notes                                              |
|-------------------|---------------------|----------------------------------------------------|
| `accessionNumber` | String              | unique, auto-generated (`ACC-000001`, …)           |
| `title`           | String              | required, indexed                                  |
| `author`          | String              | required, indexed                                  |
| `isbn`            | String              | unique, sparse                                     |
| `category`        | ObjectId → Category | required                                           |
| `publisher`       | String              |                                                    |
| `yearPublished`   | Number              |                                                    |
| `edition`         | String              |                                                    |
| `totalCopies`     | Number              | required, min 1                                    |
| `availableCopies` | Number              | required; computed as `totalCopies − issued`       |
| `shelfLocation`   | String              | e.g. `A3-Shelf2`                                   |
| `description`     | String              |                                                    |
| `coverImage`      | String              | file path                                          |
| `language`        | String              | default `English`                                  |
| `isActive`        | Boolean             | default `true`                                     |
| `addedBy`         | ObjectId → User     |                                                    |
| `timestamps`      | —                   |                                                    |

### 10.5. Member

| Field             | Type     | Notes                                              |
|-------------------|----------|----------------------------------------------------|
| `memberID`        | String   | unique, auto-generated (`LIB-2026-00001`, …)       |
| `firstName`       | String   | required                                           |
| `lastName`        | String   | required                                           |
| `email`           | String   | unique, sparse                                     |
| `phone`           | String   | required                                           |
| `gender`          | enum     | `Male`, `Female`, `Other`                          |
| `address`         | String   |                                                    |
| `memberType`      | enum     | `Student`, `Staff`, `External` (required)          |
| `department`      | String   |                                                    |
| `photo`           | String   | file path                                          |
| `membershipStart` | Date     | default `Date.now`                                 |
| `membershipEnd`   | Date     | default `start + 1 year`                           |
| `maxBooksAllowed` | Number   | default `3`                                        |
| `isActive`        | Boolean  | default `true`                                     |
| `registeredBy`    | ObjectId → User |                                              |
| `timestamps`      | —        |                                                    |

### 10.6. Transaction

| Field            | Type     | Notes                                              |
|------------------|----------|----------------------------------------------------|
| `transactionCode`| String   | unique, auto-generated (`TXN-20260000001`, …)      |
| `book`           | ObjectId → Book   | required                                  |
| `member`         | ObjectId → Member | required                                  |
| `issuedBy`       | ObjectId → User   | required                                  |
| `issueDate`      | Date     | default `Date.now`                                 |
| `dueDate`        | Date     | required (`issueDate + 14 days` by default)        |
| `returnDate`     | Date     | null until returned                                |
| `status`         | enum     | `Issued`, `Returned`, `Overdue`, `Lost`            |
| `renewalCount`   | Number   | default `0`, max `2`                              |
| `fineAmount`     | Number   | default `0`                                        |
| `finePaid`       | Boolean  | default `false`                                    |
| `notes`          | String   |                                                    |
| `timestamps`     | —        |                                                    |

### 10.7. AuditLog

| Field        | Type              | Notes                                            |
|--------------|-------------------|--------------------------------------------------|
| `performedBy`| ObjectId → User   |                                                  |
| `action`     | String            | e.g. `book.create`, `member.deactivate`          |
| `targetModel`| String            | e.g. `Book`, `Member`                            |
| `targetId`   | ObjectId          |                                                  |
| `details`    | String            | human-readable description                       |
| `ipAddress`  | String            | request IP                                       |
| `timestamp`  | Date              | default `Date.now`                               |

---

## 11. Role and Permission Matrix

| Feature                            | Admin | Librarian | Member |
|------------------------------------|:-----:|:---------:|:------:|
| Login                              |  YES  |    YES    |  YES   |
| Add / Edit / Delete book           |  YES  |    YES    |  NO    |
| View book list                     |  YES  |    YES    |  YES   |
| Search books                       |  YES  |    YES    |  YES   |
| Register new member                |  YES  |    YES    |  NO    |
| Edit member details                |  YES  |    YES    |  NO    |
| Deactivate member                  |  YES  |    NO     |  NO    |
| Issue book to member               |  YES  |    YES    |  NO    |
| Return book                        |  YES  |    YES    |  NO    |
| Renew borrowing period             |  YES  |    YES    |  NO    |
| View all transactions              |  YES  |    YES    |  NO    |
| View own borrowed books            |  YES  |    YES    |  YES   |
| View overdue list                  |  YES  |    YES    |  NO    |
| Mark book as lost                  |  YES  |    YES    |  NO    |
| Manage categories                  |  YES  |    NO     |  NO    |
| Manage system users                |  YES  |    NO     |  NO    |
| Generate and export reports        |  YES  |    NO     |  NO    |
| View audit logs                    |  YES  |    NO     |  NO    |
| Configure system settings          |  YES  |    NO     |  NO    |
| View own borrowing history         |  YES  |    YES    |  YES   |

---

## 12. Fine Calculation Logic

**Formula:**

```
fineAmount = max(0, daysBetween(dueDate, returnDate_or_today)) × fineRatePerDay
```

- `dueDate` — the date the book was supposed to be returned
- `returnDate_or_today` — the actual return date if returned, otherwise today's date
- `fineRatePerDay` — configured in Settings (default `NGN 50/day`)

**Implementation:** `server/utils/calcFine.js` and `client/src/utils/calcFine.js` (mirrored, single source of truth on the server side).

**Examples (rate = 50 NGN/day):**

| Due date   | Return / reference date | Days overdue | Fine (NGN) |
|------------|--------------------------|--------------|------------|
| 2026-06-10 | 2026-06-15 (returned)    | 5            | 250        |
| 2026-06-10 | 2026-06-10 (on time)     | 0            | 0          |
| 2026-06-10 | 2026-06-22 (still out)   | 12           | 600        |
| 2026-06-10 | 2026-06-03 (early)       | 0            | 0          |

**Business rules tied to fines:**

- A member with any unpaid fine cannot borrow new books.
- The system recalculates the live fine on every visit to the overdue list and on the dashboard.
- See section 12.1 below for the online payment flow.

### 12.1 Fine Payment & Receipts

Fine collection is integrated with **Paystack** (test mode by default). The system tracks every fine in three layers:

1. **Transaction** — `fineAmount`, `outstandingFine`, `paymentStatus: "unpaid" | "partial" | "paid"`.
2. **Payment** (model `server/models/Payment.js`) — one document per attempted payment: `reference`, `gateway`, `status`, `method`, `channel`, `amount`, `gatewayRef`, `paidAt`, `rawResponse`, `initiatedBy`.
3. **Audit log** — every payment event (`payment.initiate`, `payment.success`, `payment.failed`, `payment.cash`, `payment.receipt`) is recorded with the staff/member who triggered it.

**How a member pays a fine online:**

1. The member visits **My Fines** (`/my-fines`) or the librarian visits **Return Book** (`/transactions/return`).
2. The fine card shows the outstanding amount. The member clicks **Pay Now** → **Pay Online (Paystack)**.
3. The frontend calls `POST /api/payments/initiate` which:
   - creates a `Payment` document with `status: "pending"` and a unique `reference` (`PAY-YYYY#########`)
   - calls Paystack's `transaction/initialize` API to obtain an `authorization_url`
   - returns the URL to the browser
4. The browser opens Paystack's hosted checkout in a new tab. The member pays with a card, bank transfer, USSD, or QR. **Test cards:** `4084084084084081` (success), `4084080000000408` (insufficient funds), any future expiry, CVV `408`, PIN `0000`, OTP `123456`.
5. After payment, the frontend polls `GET /api/payments/verify/:reference`. The verify endpoint calls Paystack's `transaction/verify/:reference` and, on success, sets the `Payment.status` to `success`, recomputes `Transaction.outstandingFine` and `paymentStatus`, and returns the updated transaction.
6. As a backup, Paystack also POSTs `charge.success` to `POST /api/payments/webhook/paystack`. The webhook is verified with `x-paystack-signature` (HMAC SHA-512) using `PAYSTACK_WEBHOOK_SECRET`. The handler is idempotent.

**How a librarian records a cash payment:**

- On the same modal, the librarian chooses **Mark as Cash Paid** (or **Bank Transfer**) and submits a method + optional reference.
- `POST /api/payments/cash` creates a `Payment` with `status: "success"` directly. No gateway call.

**Receipts:**

- `GET /api/payments/receipt/:id` returns a styled PDF (reuses `pdfGenerator`): library header, receipt number, date, member info, book info, fine, amount paid, gateway reference, recorded-by line.
- Members download receipts from **My Fines → Payment history → Receipt**. Staff download from **Payments → Receipt** in the admin/librarian Payments page.

**Return policy (Strict):**

- When `Settings.requirePaymentBeforeReturn` is `true` (default), the **Return Book** page will block the "Confirm Return" button until the full fine is paid. The system shows a clear message: *"Fine of NGN X must be paid before this book can be returned."*
- When `false`, fines can accumulate debt. The existing `issue` endpoint still blocks new loans for any member with an outstanding fine.

**Configuring Paystack (test mode):**

1. Sign up at https://paystack.com and visit Settings → API Keys.
2. Copy the **Test Secret Key** (`sk_test_…`), **Test Public Key** (`pk_test_…`), and **Webhook Secret** into `server/.env`:
   ```
   PAYSTACK_SECRET_KEY=sk_test_…
   PAYSTACK_PUBLIC_KEY=pk_test_…
   PAYSTACK_WEBHOOK_SECRET=whsec_…
   PAYMENT_CALLBACK_URL=http://localhost:5000/api/payments/webhook/paystack
   ```
3. The frontend auto-loads Paystack's inline script (`https://js.paystack.co/v1/inline.js`) when the user clicks **Pay Online**.
4. To receive real webhook events locally, expose the server with `ngrok` and set the public URL as the webhook in your Paystack dashboard.

**New endpoints (server):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/payments/initiate` | any | Start a Paystack payment for an outstanding fine |
| GET  | `/api/payments/verify/:reference` | any (own only) | Verify a payment after the member pays |
| POST | `/api/payments/cash` | admin, librarian | Record a cash or bank-transfer payment |
| GET  | `/api/payments` | admin, librarian | List all payments (paginated, filterable) |
| GET  | `/api/payments/member/:memberId` | any (own only) | A member's payment history |
| GET  | `/api/payments/receipt/:id` | any (own only) | PDF receipt |
| GET  | `/api/payments/:id` | any (own only) | Single payment |
| POST | `/api/payments/webhook/paystack` | public (signature) | Paystack server-to-server callback |
| GET  | `/api/members/:id/outstanding` | any (own only) | A member's outstanding fine balance |



---

## 13. Automated Overdue System

The system uses **two mechanisms** to keep overdue status accurate.

### 13.1. Real-time check (on-demand)

Every time the **Overdue list** page or the **Dashboard** is loaded, the API runs a synchronous update that:

1. Queries `Transaction` documents where `status = "Issued"` and `dueDate < today`.
2. Sets their `status` to `"Overdue"`.
3. Recalculates `fineAmount` based on the current date.

This ensures the UI is always up-to-date without waiting for the cron job.

### 13.2. Scheduled job (daily 08:00)

`server/jobs/overdueScheduler.js` registers a `node-cron` task on the schedule `0 8 * * *` (every day at 08:00 server time). When it fires, it:

1. Runs the same overdue update as above.
2. Sends an individual reminder email to each affected member:

   > **Subject:** Library Overdue Notice — *Book Title*
   > **Body:** Member name, book title, issue date, due date, days overdue, fine amount.

3. Sends a summary email to the admin listing all overdue transactions.

### 13.3. In-app indicators

- The **Overdue** sidebar item shows a red badge with the live count.
- The **Dashboard** "Overdue" metric card is red and clickable, linking to `/transactions/overdue`.
- All transaction tables highlight overdue rows in light red (`#FEE2E2`).
- The **Member profile** page shows an Overdue badge on each currently borrowed book that is past due.

---

## 14. Security Features

| Concern               | Implementation                                                                          |
|-----------------------|------------------------------------------------------------------------------------------|
| Password storage      | `bcryptjs` with **saltRounds = 10** (in `models/User.js` `pre('save')` hook)             |
| Authentication        | JWT signed with `JWT_SECRET`, **expires in 8 hours**                                    |
| Authorization         | `authMiddleware` (verify JWT, attach `req.user`) and `roleMiddleware(roles[])`          |
| CORS                  | `cors({ origin: CLIENT_URL, credentials: true })` — only the React dev server is allowed |
| File uploads          | `multer` with `fileFilter` accepting **JPEG/PNG only** and `limits.fileSize = 2 MB`      |
| Audit trail           | Every create / update / delete writes an `AuditLog` entry with user, action, target, IP, and timestamp |
| Soft deletes          | Books and members are never hard-deleted; `isActive = false` is used instead            |
| Secret management     | All secrets live in `server/.env` which is in `.gitignore`                                |
| Session expiry        | Axios response interceptor catches `401` and redirects to `/login?session=expired`       |

---

## 15. Color Palette and Design System

The frontend uses a single source of truth: `client/tailwind.config.js`. All values map directly to the brand.

| Token                | Hex        | Usage                                                        |
|----------------------|------------|--------------------------------------------------------------|
| `primary.DEFAULT`    | `#2C3E7A`  | Deep Library Navy — main brand, primary buttons              |
| `primary.light`      | `#3D54A8`  | Hover / active states, active sidebar item                   |
| `primary.dark`       | `#1A2550`  | Navbar and sidebar background                                |
| `primary.pale`       | `#EAECF8`  | Card fills, table header tints                               |
| `accent.DEFAULT`     | `#C0882A`  | Warm Book Gold — highlights, badges                          |
| `accent.light`       | `#FAF0DC`  | Gold badge backgrounds                                       |
| `accent.dark`        | `#8C6010`  | Gold hover                                                   |
| `neutral.50`         | `#F8F9FC`  | Page background                                              |
| `neutral.200`        | `#DDE1EF`  | Card borders, dividers                                       |
| `status.success`     | `#16A34A`  | Success toasts, "Available" badge                            |
| `status.warning`     | `#D97706`  | "Limited" / reserved badges                                  |
| `status.danger`      | `#DC2626`  | Overdue badges, overdue metric, danger buttons               |
| `status.info`        | `#0891B2`  | "Issued" badges, info toasts                                 |
| `status.overdue`     | `#DC2626`  | Overdue row background                                       |
| `status.returned`    | `#16A34A`  | Returned row background                                      |
| `status.issued`      | `#0891B2`  | Issued row background                                        |
| `status.reserved`    | `#D97706`  | Reserved row background                                      |

The full 10-step neutral scale (50–900) is also defined. Component classes like `btn-primary`, `btn-secondary`, `btn-danger`, `input`, `card`, `table-header`, `row-overdue`, `row-issued`, and `row-returned` are defined in `client/src/index.css` for consistency.

---

## 16. Business Rules and Edge Cases

The system enforces 21 explicit business rules:

1. A member cannot borrow more books than their `maxBooksAllowed` (default 3).
2. A member with an expired membership cannot borrow — error: "Membership Expired".
3. A member with unpaid fines cannot borrow — error: "Outstanding fine: NGN X".
4. A book with `availableCopies == 0` cannot be issued — error: "No copies available".
5. Renewal is blocked after `maxRenewals` (default 2) renewals.
6. Renewal is blocked if the book is currently overdue — member must return + pay fine first.
7. Marking a book as Lost does **not** increment `availableCopies` back.
8. Deleting a category with assigned books is blocked.
9. Deactivating a member does not cancel active loans — a warning is shown listing them.
10. Adding a book with an ISBN that already exists raises a duplicate warning.
11. Adding a member with an existing phone or email raises a duplicate warning.
12. A scheduled job sends a membership-expiry warning email 7 days before `membershipEnd`.
13. All entities are soft-deleted — never hard-deleted.
14. All list views have a 400 ms debounce on the search input.
15. All paginated views show 10 records per page (server-side pagination).
16. All dates are displayed as `DD/MM/YYYY`.
17. All currency is formatted as `NGN 1,234`.
18. Session expiry auto-redirects to `/login` with a "Session expired" toast.
19. Loading spinners appear on every async operation.
20. `react-hot-toast` is used for all success / error / info feedback.
21. Confirm dialogs appear before delete, deactivate, and mark-lost actions.

---

## 17. Known Limitations

- **No barcode scanner** — book accession numbers and member IDs must be typed or searched manually.
- **No SMS notifications** — overdue and expiry notices are email-only.
- **No offline mode** — the application requires an active internet connection.
- **No file preview** — uploaded cover images and member photos are stored as-is; no automatic resizing.
- **No multi-branch support** — the system models a single library.
- **No reservation queue** — books are issued on a first-come, first-served basis.
- **No internationalization** — the UI is English-only and currency is hard-coded to NGN.

---

## 18. Future Improvements

- **SMS notifications** via Termii or Africa's Talking for overdue, expiry, and renewal reminders.
- **Mobile app** (React Native or Flutter) for both staff and members.
- **QR / barcode scanner** for book accession numbers and member IDs at the issue / return desk.
- **Reservation / hold queue** for books with zero available copies.
- **Multi-branch library support** with branch-aware catalogues and transfers.
- **E-book lending** with DRM-protected PDF / EPUB delivery.
- **Recommendation engine** based on a member's borrowing history.
- **Offline-first PWA** with a service worker and IndexedDB cache.
- **Accessibility audit** to meet WCAG 2.1 AA compliance.
- **Internationalization** (i18n) — English, French, Pidgin, Igbo, Hausa, Yoruba.

---

## 19. Project Structure

```
enhanced_library_management_system/
├── client/                            # React + Vite + Tailwind frontend
│   ├── public/                        # Static assets (favicon, etc.)
│   ├── src/
│   │   ├── api/                       # Axios instance + all API function modules
│   │   ├── assets/                    # Logo, book placeholder
│   │   ├── components/
│   │   │   ├── common/                # Button, Input, Modal, Badge, Spinner, Table, Pagination, ConfirmDialog
│   │   │   ├── layout/                # Navbar, Sidebar, PageWrapper, AuthLayout
│   │   │   └── features/              # BookCard, MemberCard, TransactionRow, OverdueAlert
│   │   ├── context/                   # AuthContext
│   │   ├── hooks/                     # useAuth, useFetch, useSearch, useOverdueCount
│   │   ├── pages/                     # 21 page components across auth / admin / librarian / member
│   │   ├── routes/                    # ProtectedRoute, RoleRoute, AppRoutes
│   │   ├── utils/                     # formatDate, formatCurrency, calcDueDate, calcFine, validators, constants
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                            # Express + Mongoose API
│   ├── config/                        # db.js, email.js
│   ├── controllers/                   # 7 controllers
│   ├── middleware/                    # auth, role, error, upload (multer)
│   ├── models/                        # 6 Mongoose models
│   ├── routes/                        # 7 route files
│   ├── utils/                         # generateToken, generateMemberID, generateAccessionNo, calcFine, pdfGenerator
│   ├── jobs/                          # overdueScheduler (node-cron)
│   ├── seed/                          # seed.js
│   ├── uploads/                       # file uploads
│   ├── .env
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
├── .gitignore
├── package.json                       # npm workspaces root + concurrently
├── README.md                          # this file
├── DEFENSE_NOTES.md                   # project defense Q&A
└── library-system-MASTER-PROMPT.txt   # the original specification
```

---

## 20. References

The following sources informed the design and implementation of this project. All entries are formatted in **APA 7th edition** style.

1. Mozilla Developer Network. (2024). *Express web framework (Node.js/JavaScript)*. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs

2. Vite.js. (2024). *Vite — Next generation frontend tooling*. https://vitejs.dev/

3. React. (2024). *React — A JavaScript library for building user interfaces*. Meta Open Source. https://react.dev/

4. Tailwind Labs. (2024). *Tailwind CSS — A utility-first CSS framework*. https://tailwindcss.com/

5. MongoDB, Inc. (2024). *MongoDB — The document database*. https://www.mongodb.com/docs/

6. Automattic, Inc. (2024). *Mongoose — Elegant mongodb object modeling for Node.js*. https://mongoosejs.com/

7. Auth0. (2024). *Introduction to JSON Web Tokens (JWT)*. https://jwt.io/introduction

8. OpenJS Foundation. (2024). *bcrypt.js — Optimized bcrypt in plain JavaScript with zero dependencies*. https://github.com/dcodeIO/bcrypt.js

9. Harutyunyan, A. (2024). *node-cron — A simple cron-like job scheduler for Node.js*. https://github.com/node-cron/node-cron

10. Nodemailer. (2024). *Nodemailer — Send emails from Node.js*. https://nodemailer.com/

11. Bevywise Networks. (2024). *PDFKit — A JavaScript PDF generation library for Node and the browser*. https://pdfkit.org/

12. Mozilla Developer Network. (2024). *Cross-Origin Resource Sharing (CORS)*. https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

13. OWASP Foundation. (2024). *OWASP Top Ten Web Application Security Risks*. https://owasp.org/www-project-top-ten/

14. Recharts. (2024). *Recharts — A composable charting library built on React components*. https://recharts.org/

15. React Hook Form. (2024). *React Hook Form — Performant, flexible and extensible forms with easy-to-use validation*. https://react-hook-form.com/

---

## License

This project is submitted as an **academic final-year project** for the Department of Computer Science, Delta State Polytechnic, Otefe-Oghara. All rights are reserved by the author unless otherwise stated.

---

**Author:** *\<Your Name\>*
**Supervisor:** *\<Supervisor's Name\>*
**Date:** *\<Submission Date\>*
