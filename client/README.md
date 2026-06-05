# Client — Enhanced Library Management System

The `client/` package is the **React 18 + Vite + Tailwind CSS** single-page application that the librarian, admin, and member roles use.

See the project root [`README.md`](../README.md) for the full system overview, tech stack, installation steps, API reference, and design system. This file documents only what's specific to the client package.

---

## Local-only quick start

```bash
# from the repo root
npm install
npm run dev:client      # or just: npm run dev
```

The dev server starts on http://localhost:5173 and proxies `/api/*` requests to `http://localhost:5000` (configured in `vite.config.js`).

To run the client **without** the server (e.g. for pure UI work), change `VITE_API_URL` in `client/.env` to point at any reachable API instance.

## Scripts

| Script          | Description                                                  |
|-----------------|--------------------------------------------------------------|
| `npm run dev`   | Start Vite dev server with HMR on :5173                      |
| `npm run build` | Production build → `client/dist/`                            |
| `npm run preview` | Serve the production build locally for smoke-testing      |

## Environment

| Variable        | Default                       | Purpose                  |
|-----------------|-------------------------------|--------------------------|
| `VITE_API_URL`  | `http://localhost:5000/api`   | Base URL for all API calls |

## Folder map

```
src/
├── api/        # Axios instance + one .api.js per resource
├── assets/     # Logo, book placeholder
├── components/
│   ├── common/   # Button, Input, Modal, Badge, Spinner, Table, Pagination, ConfirmDialog
│   ├── layout/   # Navbar, Sidebar, PageWrapper, AuthLayout
│   └── features/ # BookCard, MemberCard, TransactionRow, OverdueAlert
├── context/    # AuthContext (user, role, token, login/logout)
├── hooks/      # useAuth, useFetch, useSearch (400ms debounce), useOverdueCount
├── pages/      # 21 pages — auth, admin, librarian, member
├── routes/     # ProtectedRoute, RoleRoute, AppRoutes
├── utils/      # formatDate, formatCurrency, calcDueDate, calcFine, validators, constants
├── App.jsx
├── main.jsx
└── index.css
```

## Design system

All colors are defined in `tailwind.config.js` and exposed as Tailwind utilities:

- `bg-primary`, `text-primary`, `border-primary`
- `bg-primary-light` / `bg-primary-dark` / `bg-primary-pale`
- `bg-accent`, `text-accent`, etc.
- `bg-neutral-50` … `bg-neutral-900`
- `bg-status-success`, `bg-status-warning`, `bg-status-danger`, `bg-status-info`
- `bg-status-overdue`, `bg-status-returned`, `bg-status-issued`, `bg-status-reserved`

Component classes in `src/index.css` (use them in JSX as `<div className="card">`, etc.):

- `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.input`, `.label`
- `.card`
- `.table-header`
- `.row-overdue`, `.row-issued`, `.row-returned`

## Conventions

- All async data is fetched via the `api/*.api.js` modules and wrapped in `useFetch` or component-level `useEffect` with `Spinner`.
- All list searches use the `useSearch` hook which debounces input at 400 ms.
- All dates are formatted with `formatDate()` → `DD/MM/YYYY`.
- All currency is formatted with `formatNGN()` → `NGN 1,234`.
- All async operations show a `react-hot-toast` on success or error.
- All destructive actions (delete, deactivate, mark lost) require a `ConfirmDialog`.
