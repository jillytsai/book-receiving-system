import { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';

function EditableCell({ value, onSave, isTitle }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');

  useEffect(() => {
    setCurrentValue(value || '');
  }, [value]);

  if (isEditing) {
    return (
      <td style={{ padding: '0.5rem' }}>
        <input 
          autoFocus
          style={{ width: '100%', minWidth: '100px', padding: '0.5rem', background: 'var(--surface-color-light)', color: 'white', border: '1px solid var(--accent-primary)', borderRadius: '4px', outline: 'none' }}
          value={currentValue}
          onChange={e => setCurrentValue(e.target.value)}
          onBlur={() => {
            setIsEditing(false);
            if (currentValue.trim() !== String(value || '').trim()) {
              onSave(currentValue.trim());
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setIsEditing(false);
              if (currentValue.trim() !== String(value || '').trim()) {
                onSave(currentValue.trim());
              }
            }
          }}
        />
      </td>
    );
  }

  return (
    <td 
      onClick={() => setIsEditing(true)}
      style={{
        ...(isTitle ? { minWidth: '200px', maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word' } : {}),
        cursor: 'pointer'
      }}
      title="點擊即可修改"
    >
      {value || '-'}
    </td>
  );
}

export default function BookList({ books, onEditBook }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  if (!books || books.length === 0) return null;

  // Dynamically extract all column names, ignoring internal states and unwanted columns
  const excludedColumns = ['isReceived', '_searchableBarcodes', '箱號', '紙插序號'];
  const columns = Object.keys(books[0]).filter(key => !excludedColumns.includes(key));

  // Pagination logic
  const totalPages = Math.ceil(books.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedBooks = books.slice(startIndex, startIndex + pageSize);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle className="text-accent" />
          圖書清單明細
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            每頁顯示:
            <select 
              value={pageSize} 
              onChange={handlePageSizeChange}
              style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem', background: 'var(--surface-color-light)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            >
              <option value={20}>20 筆</option>
              <option value={50}>50 筆</option>
              <option value={100}>100 筆</option>
            </select>
          </label>
        </div>
      </div>

      <div className="table-container" style={{ flexGrow: 1 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '100px' }}>狀態</th>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedBooks.map((book, index) => (
              <tr key={book['登錄號'] + '-' + index} style={{ backgroundColor: book.isReceived ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                <td>
                  {book.isReceived ? (
                    <span className="status-badge received">
                      <CheckCircle size={14} /> 已點收
                    </span>
                  ) : (
                    <span className="status-badge pending">
                      <Clock size={14} /> 未點收
                    </span>
                  )}
                </td>
                {columns.map(col => (
                  <EditableCell 
                    key={col}
                    value={book[col]}
                    isTitle={col === '題名'}
                    onSave={(newValue) => onEditBook(startIndex + index, col, newValue)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          顯示第 {startIndex + 1} 到 {Math.min(startIndex + pageSize, books.length)} 筆，共 {books.length} 筆
        </span>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            上一頁
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
            {currentPage} / {totalPages}
          </span>
          <button 
            className="btn" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  );
}
