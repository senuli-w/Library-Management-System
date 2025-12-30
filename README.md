# Library Management System

A full-stack library manager with Node.js/Express, SQLite (via sql.js, no native builds), and a polished vanilla HTML/CSS/JS frontend. Track books, manage availability, and handle loans with return workflow.

## Features
- Book CRUD (title, author, category, copies total/available)
- Loan workflow: create loan, mark returned; availability auto-adjusts
- Search books by title/author/category
- Responsive, modern UI with no build step
- SQLite by default; path configurable via env

## Tech Stack
- Backend: Node.js, Express, sql.js (SQLite, WASM; no native compile)
- Frontend: Vanilla HTML, CSS, JS (no bundler)

## Quickstart
```bash
cd library-management-system
cp .env.example .env   # optional; defaults are fine
npm install
npm run dev
# open http://localhost:3000
```

## API
- `GET /api/health` – heartbeat
- `GET /api/books?search=` – list/search books
- `POST /api/books` – create book `{ title, author, category?, copies_total? }`
- `PUT /api/books/:id` – update title/author/category/copies_total
- `DELETE /api/books/:id` – blocked if active loans exist
- `GET /api/loans` – list loans (includes book title/author)
- `POST /api/loans` – create loan `{ book_id, borrower_name, borrower_email?, due_date? }`
- `POST /api/loans/:id/return` – mark loan returned

## Env Vars
- `PORT` (default `3000`)
- `DB_PATH` (default `./data/library.db`)

## Project Structure
```
library-management-system/
├── server.js          # Express app + routes
├── db.js              # SQLite init and connection
├── package.json
├── .env.example
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── data/              # SQLite database file (created at runtime)
```

## Notes
- Active loans prevent deleting a book.
- Updating total copies automatically adjusts available copies but never below zero.
- UI actions (return, delete) refresh book/loan lists immediately.

## Screenshots
Add a screenshot after running locally to show the UI.
