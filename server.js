require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDb, run, all, get } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const nowIso = () => new Date().toISOString();

const bookSelectableColumns = ['title', 'author', 'category', 'copies_total'];

async function getBookById(id) {
  return get('SELECT * FROM books WHERE id = ?', [id]);
}

async function getLoanById(id) {
  return get('SELECT * FROM loans WHERE id = ?', [id]);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: nowIso() });
});

app.get('/api/books', async (req, res) => {
  const { search } = req.query;
  if (search) {
    const term = `%${search}%`;
    const rows = await all(
      `SELECT * FROM books WHERE title LIKE ? OR author LIKE ? OR category LIKE ? ORDER BY created_at DESC`,
      [term, term, term]
    );
    return res.json(rows);
  }
  const rows = await all('SELECT * FROM books ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/books', async (req, res) => {
  const { title, author, category = '', copies_total = 1 } = req.body || {};
  if (!title || !author) {
    return res.status(400).json({ message: 'title and author are required' });
  }
  const total = Number(copies_total) || 1;
  const newId = await run(
    'INSERT INTO books (title, author, category, copies_total, copies_available) VALUES (?, ?, ?, ?, ?)',
    [title.trim(), author.trim(), category.trim(), total, total]
  );
  const created = await getBookById(newId);
  res.status(201).json(created);
});

app.put('/api/books/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await getBookById(id);
  if (!existing) return res.status(404).json({ message: 'Book not found' });

  const updates = {};
  for (const key of bookSelectableColumns) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  const newTotal = updates.copies_total !== undefined ? Number(updates.copies_total) : existing.copies_total;
  if (Number.isNaN(newTotal) || newTotal < 0) {
    return res.status(400).json({ message: 'copies_total must be a positive number' });
  }

  const delta = newTotal - existing.copies_total;
  const adjustedAvailable = Math.max(0, existing.copies_available + delta);

  await run(
    `UPDATE books
     SET title = ?, author = ?, category = ?, copies_total = ?, copies_available = ?
     WHERE id = ?`,
    [
      updates.title !== undefined ? updates.title : existing.title,
      updates.author !== undefined ? updates.author : existing.author,
      updates.category !== undefined ? updates.category : existing.category,
      newTotal,
      adjustedAvailable,
      id,
    ]
  );

  const updated = await getBookById(id);
  res.json(updated);
});

app.delete('/api/books/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await getBookById(id);
  if (!existing) return res.status(404).json({ message: 'Book not found' });

  const activeLoans = await get(
    "SELECT COUNT(1) as count FROM loans WHERE book_id = ? AND status = 'borrowed'",
    [id]
  );
  if (activeLoans.count > 0) {
    return res.status(400).json({ message: 'Cannot delete book with active loans' });
  }

  await run('DELETE FROM books WHERE id = ?', [id]);
  res.status(204).send();
});

app.get('/api/loans', async (req, res) => {
  const { status } = req.query;
  let query =
    'SELECT loans.*, books.title AS book_title, books.author AS book_author FROM loans JOIN books ON loans.book_id = books.id';
  const params = [];
  if (status) {
    query += ' WHERE loans.status = ?';
    params.push(status);
  }
  query += ' ORDER BY loans.loaned_at DESC';
  const rows = await all(query, params);
  res.json(rows);
});

app.post('/api/loans', async (req, res) => {
  const { book_id, borrower_name, borrower_email = '', due_date = null } = req.body || {};
  if (!book_id || !borrower_name) {
    return res.status(400).json({ message: 'book_id and borrower_name are required' });
  }
  const book = await getBookById(Number(book_id));
  if (!book) return res.status(404).json({ message: 'Book not found' });
  if (book.copies_available <= 0) {
    return res.status(400).json({ message: 'No available copies to loan' });
  }

  const loanedAt = nowIso();
  const newId = await run(
    'INSERT INTO loans (book_id, borrower_name, borrower_email, status, loaned_at, due_date) VALUES (?, ?, ?, ?, ?, ?)',
    [book.id, borrower_name.trim(), borrower_email.trim(), 'borrowed', loanedAt, due_date]
  );

  await run('UPDATE books SET copies_available = copies_available - 1 WHERE id = ?', [book.id]);

  const created = await getLoanById(newId);
  const withBook = { ...created, book_title: book.title, book_author: book.author };
  res.status(201).json(withBook);
});

app.post('/api/loans/:id/return', async (req, res) => {
  const id = Number(req.params.id);
  const loan = await getLoanById(id);
  if (!loan) return res.status(404).json({ message: 'Loan not found' });
  if (loan.status !== 'borrowed') {
    return res.status(400).json({ message: 'Loan already returned' });
  }

  const book = await getBookById(loan.book_id);
  if (!book) return res.status(404).json({ message: 'Book missing for this loan' });

  const returnedAt = nowIso();
  await run("UPDATE loans SET status = 'returned', returned_at = ? WHERE id = ?", [returnedAt, id]);
  await run('UPDATE books SET copies_available = copies_available + 1 WHERE id = ?', [book.id]);

  const updated = await getLoanById(id);
  res.json({ ...updated, book_title: book.title, book_author: book.author });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

(async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Library Management System running on http://localhost:${PORT}`);
  });
})();
