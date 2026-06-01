import { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';



export default function BookList({ books, onEditBook }) {
  if (!books || books.length === 0) return null;

  // Dynamically extract all column names, ignoring internal states and unwanted columns
  const excludedColumns = ['isReceived', '_searchableBarcodes', '箱號', '紙插序號'];
  const columns = Object.keys(books[0]).filter(key => !excludedColumns.includes(key));

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle className="text-accent" />
          圖書清單明細
        </h2>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          共 {books.length} 筆資料 (點擊表格文字即可直接修改)
        </span>
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
            {books.map((book, index) => (
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
                  <td 
                    key={col}
                    style={{
                      ...(col === '題名' ? { minWidth: '200px', maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word' } : {}),
                      verticalAlign: 'top'
                    }}
                  >
                    <div
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      spellCheck={false}
                      onBlur={(e) => {
                        const newValue = e.target.innerText.trim();
                        if (newValue !== String(book[col] || '').trim()) {
                          onEditBook(index, col, newValue);
                        }
                      }}
                      style={{
                        outline: 'none',
                        minHeight: '1.5em',
                        cursor: 'text',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                      }}
                      onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => { if (document.activeElement !== e.target) e.target.style.background = 'transparent'; }}
                      onMouseEnter={(e) => { if (document.activeElement !== e.target) e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                    >
                      {book[col] || ''}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
