import { CheckCircle, Clock } from 'lucide-react';

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
                  <td 
                    key={col} 
                    style={{
                      ...(col === '題名' ? { minWidth: '200px', maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word' } : {}),
                      cursor: 'text'
                    }}
                    title="點擊即可直接修改"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => {
                      const newValue = e.target.innerText.trim();
                      if (newValue !== String(book[col] || '').trim()) {
                        onEditBook(index, col, newValue);
                      }
                    }}
                  >
                    {book[col] || ''}
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
