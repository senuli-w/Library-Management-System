// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Views & Navigation
const viewTitle = $('#view-title');
const navBtns = $$('.nav-btn');
const views = $$('.view');

// Dashboard
const statBooks = $('#stat-books');
const statAvailable = $('#stat-available');
const statActive = $('#stat-active');
const statBorrowers = $('#stat-borrowers');
const recentBooksEl = $('#recent-books');
const activeLoansEl = $('#active-loans');

// Books
const booksTable = $('#books-table');
const booksEmpty = $('#books-empty');
const bookForm = $('#book-form');
const bookTabs = $$('#view-books .tab');
const bookTabContents = $$('#view-books .tab-content');

// Loans
const loansTable = $('#loans-table');
const loansEmpty = $('#loans-empty');
const loanForm = $('#loan-form');
const loanBookSelect = $('#loan-book');
const loanFilter = $('#loan-filter');
const loanTabs = $$('#view-loans .tab');
const loanTabContents = $$('#view-loans .tab-content');

// Edit Modal
const editModal = $('#edit-modal');
const editForm = $('#edit-form');
const editId = $('#edit-id');
const editTitle = $('#edit-title');
const editAuthor = $('#edit-author');
const editCategory = $('#edit-category');
const editCopies = $('#edit-copies');

// Search & Toast
const globalSearch = $('#global-search');
const toast = $('#toast');

// ===== State =====
let books = [];
let loans = [];

// ===== API Helpers =====
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

// ===== Toast =====
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ===== Navigation =====
function switchView(viewName) {
  const titles = { dashboard: 'Dashboard', books: 'Books', loans: 'Loans' };
  viewTitle.textContent = titles[viewName] || viewName;

  navBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  views.forEach((v) => {
    v.classList.toggle('active', v.id === `view-${viewName}`);
  });
}

// ===== Tabs =====
function setupTabs(tabBtns, tabContents) {
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === target));
      tabContents.forEach((c) => c.classList.toggle('active', c.id === `tab-${target}`));
    });
  });
}

// ===== Data Loading =====
async function loadBooks(searchTerm = '') {
  const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
  books = await api(`/api/books${query}`);
  renderBooksTable();
  renderRecentBooks();
  populateLoanSelect();
  updateStats();
}

async function loadLoans(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  loans = await api(`/api/loans${query}`);
  renderLoansTable();
  renderActiveLoans();
  updateStats();
}

// ===== Stats =====
function updateStats() {
  const totalBooks = books.length;
  const totalAvailable = books.reduce((sum, b) => sum + b.copies_available, 0);
  const activeLoans = loans.filter((l) => l.status === 'borrowed').length;
  const uniqueBorrowers = new Set(loans.map((l) => l.borrower_name.toLowerCase())).size;

  statBooks.textContent = totalBooks;
  statAvailable.textContent = totalAvailable;
  statActive.textContent = activeLoans;
  statBorrowers.textContent = uniqueBorrowers;
}

// ===== Render Books =====
function renderBooksTable() {
  if (!books.length) {
    booksTable.innerHTML = '';
    booksEmpty.classList.remove('hidden');
    return;
  }
  booksEmpty.classList.add('hidden');

  booksTable.innerHTML = books
    .map((b) => {
      const badge = b.copies_available === 0 ? 'out' : b.copies_available <= 2 ? 'low' : 'available';
      return `
        <tr>
          <td><strong>${escapeHtml(b.title)}</strong></td>
          <td>${escapeHtml(b.author)}</td>
          <td>${escapeHtml(b.category) || '—'}</td>
          <td>${b.copies_total}</td>
          <td><span class="badge ${badge}">${b.copies_available}</span></td>
          <td>
            <div class="action-btns">
              <button class="btn-icon" onclick="openEditModal(${b.id})" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon danger" onclick="deleteBook(${b.id})" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderRecentBooks() {
  if (!books.length) {
    recentBooksEl.innerHTML = '<div class="list-empty">No books yet</div>';
    return;
  }

  recentBooksEl.innerHTML = books
    .slice(0, 5)
    .map((b) => {
      const badge = b.copies_available === 0 ? 'out' : b.copies_available <= 2 ? 'low' : 'available';
      return `
        <div class="list-item">
          <div class="list-item-info">
            <h4>${escapeHtml(b.title)}</h4>
            <p>${escapeHtml(b.author)}</p>
          </div>
          <span class="badge ${badge}">${b.copies_available} avail</span>
        </div>
      `;
    })
    .join('');
}

// ===== Render Loans =====
function renderLoansTable() {
  if (!loans.length) {
    loansTable.innerHTML = '';
    loansEmpty.classList.remove('hidden');
    return;
  }
  loansEmpty.classList.add('hidden');

  loansTable.innerHTML = loans
    .map((l) => {
      const statusClass = l.status === 'borrowed' ? 'borrowed' : 'returned';
      return `
        <tr>
          <td><strong>${escapeHtml(l.book_title)}</strong></td>
          <td>${escapeHtml(l.borrower_name)}</td>
          <td>${l.borrower_email || '—'}</td>
          <td>${formatDate(l.loaned_at)}</td>
          <td>${l.due_date ? formatDate(l.due_date) : '—'}</td>
          <td><span class="badge ${statusClass}">${l.status}</span></td>
          <td>
            ${l.status === 'borrowed' ? `
              <button class="btn-primary" style="padding: 8px 16px; font-size: 0.8125rem;" onclick="returnLoan(${l.id})">Return</button>
            ` : ''}
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderActiveLoans() {
  const active = loans.filter((l) => l.status === 'borrowed');
  if (!active.length) {
    activeLoansEl.innerHTML = '<div class="list-empty">No active loans</div>';
    return;
  }

  activeLoansEl.innerHTML = active
    .slice(0, 5)
    .map((l) => `
      <div class="list-item">
        <div class="list-item-info">
          <h4>${escapeHtml(l.book_title)}</h4>
          <p>${escapeHtml(l.borrower_name)}</p>
        </div>
        <button class="btn-text" onclick="returnLoan(${l.id})">Return</button>
      </div>
    `)
    .join('');
}

// ===== Loan Select =====
function populateLoanSelect() {
  const available = books.filter((b) => b.copies_available > 0);
  if (!available.length) {
    loanBookSelect.innerHTML = '<option value="">No books available</option>';
    loanBookSelect.disabled = true;
    return;
  }
  loanBookSelect.disabled = false;
  loanBookSelect.innerHTML = available
    .map((b) => `<option value="${b.id}">${escapeHtml(b.title)} (${b.copies_available} avail)</option>`)
    .join('');
}

// ===== Book Actions =====
async function deleteBook(id) {
  if (!confirm('Are you sure you want to delete this book?')) return;
  try {
    await api(`/api/books/${id}`, { method: 'DELETE' });
    showToast('Book deleted successfully');
    await loadBooks();
    await loadLoans();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditModal(id) {
  const book = books.find((b) => b.id === id);
  if (!book) return;

  editId.value = book.id;
  editTitle.value = book.title;
  editAuthor.value = book.author;
  editCategory.value = book.category || '';
  editCopies.value = book.copies_total;
  editModal.classList.add('active');
}

function closeEditModal() {
  editModal.classList.remove('active');
}

// ===== Loan Actions =====
async function returnLoan(id) {
  try {
    await api(`/api/loans/${id}/return`, { method: 'POST' });
    showToast('Book returned successfully');
    await loadBooks();
    await loadLoans();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===== Utilities =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ===== Event Listeners =====
// Navigation
navBtns.forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// View All buttons
$$('[data-view]').forEach((btn) => {
  if (!btn.classList.contains('nav-btn')) {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  }
});

// Tab buttons from empty states and forms
$$('[data-tab]').forEach((btn) => {
  if (!btn.classList.contains('tab')) {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      const viewSection = btn.closest('.view');
      if (viewSection) {
        viewSection.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
        viewSection.querySelectorAll('.tab-content').forEach((c) => c.classList.toggle('active', c.id === `tab-${tabName}`));
      }
    });
  }
});

// Setup view tabs
setupTabs(bookTabs, bookTabContents);
setupTabs(loanTabs, loanTabContents);

// Book form
bookForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(bookForm);
  const payload = Object.fromEntries(formData.entries());
  payload.copies_total = Number(payload.copies_total) || 1;

  try {
    await api('/api/books', { method: 'POST', body: JSON.stringify(payload) });
    bookForm.reset();
    showToast('Book added successfully');
    // Switch to list tab
    bookTabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === 'book-list'));
    bookTabContents.forEach((c) => c.classList.toggle('active', c.id === 'tab-book-list'));
    await loadBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Loan form
loanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(loanForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await api('/api/loans', { method: 'POST', body: JSON.stringify(payload) });
    loanForm.reset();
    showToast('Loan created successfully');
    // Switch to list tab
    loanTabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === 'loan-list'));
    loanTabContents.forEach((c) => c.classList.toggle('active', c.id === 'tab-loan-list'));
    await loadBooks();
    await loadLoans();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Edit form
editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = editId.value;
  const payload = {
    title: editTitle.value,
    author: editAuthor.value,
    category: editCategory.value,
    copies_total: Number(editCopies.value),
  };

  try {
    await api(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    closeEditModal();
    showToast('Book updated successfully');
    await loadBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Modal close
$$('.modal-close').forEach((btn) => {
  btn.addEventListener('click', closeEditModal);
});

editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// Loan filter
loanFilter.addEventListener('change', () => {
  loadLoans(loanFilter.value);
});

// Global search
globalSearch.addEventListener(
  'input',
  debounce((e) => {
    const term = e.target.value.trim();
    loadBooks(term);
    switchView('books');
  }, 300)
);

// ===== Init =====
(async function init() {
  try {
    await loadBooks();
    await loadLoans();
  } catch (err) {
    showToast('Failed to load data', 'error');
    console.error(err);
  }
})();

// Expose functions for inline onclick handlers
window.deleteBook = deleteBook;
window.openEditModal = openEditModal;
window.returnLoan = returnLoan;
