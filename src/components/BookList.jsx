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
  if (!books || books.length === 0) return null;

  // Dynamically extract all column names, ignoring internal states and unwanted columns
  const excludedColumns = ['isReceived', '_searchableBarcodes', '箱號', '紙插序號'];
  const columns = Object.keys(books[0]).filter(key => !excludedColumns.includes(key));

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>圖書清單</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>狀態</th>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {books.map((book, index) => (
              <tr key={book['登錄號'] + '-' + index} className={book.isReceived ? 'received' : ''}>
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
                    onSave={(newValue) => onEditBook(index, col, newValue)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
