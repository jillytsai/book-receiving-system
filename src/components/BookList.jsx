import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock } from 'lucide-react';



export default function BookList({ books, onEditBook, receivingMode = 'barcode' }) {
  const topScrollRef = useRef(null);
  const tableContainerRef = useRef(null);
  const tableRef = useRef(null);
  const [tableWidth, setTableWidth] = useState(0);

  useEffect(() => {
    if (!tableRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setTableWidth(entry.contentRect.width);
      }
    });
    observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, [books]);

  const handleTopScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  if (!books || books.length === 0) return null;

  // Dynamically extract all column names, ignoring internal states and unwanted columns
  const excludedKeywords = [
    'isReceived', 
    '_searchableBarcodes', 
    '_scannedBarcodes', 
    '_searchableISBNs', 
    '_scannedISBNCount', 
    '_targetQuantity', 
    '箱號', 
    '紙插序號', 
    '_original', 
    '書目紀錄ID', 
    '備註'
  ];
  let columns = Object.keys(books[0]).filter(key => {
    return !excludedKeywords.some(kw => key.includes(kw));
  });

  // Move '來源批次' to the front if present
  const batchIndex = columns.indexOf('來源批次');
  if (batchIndex !== -1) {
    columns.splice(batchIndex, 1);
    columns.unshift('來源批次');
  }

  // Move '置放地點' right after '出版年'
  const locationIndex = columns.indexOf('置放地點');
  if (locationIndex !== -1) {
    columns.splice(locationIndex, 1);
    const pubYearIndex = columns.indexOf('出版年');
    if (pubYearIndex !== -1) {
      columns.splice(pubYearIndex + 1, 0, '置放地點');
    } else {
      // fallback if 出版年 doesn't exist for some reason
      columns.push('置放地點');
    }
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle className="text-accent" />
          圖書清單明細
          <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--accent-primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            {receivingMode === 'barcode' ? '🏷️ 條碼點收模式' : '🔢 ISBN 點收模式'}
          </span>
        </h2>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          共 {books.length} 筆資料 (點擊表格文字即可直接修改)
        </span>
      </div>

      {/* Top Scrollbar Container */}
      {tableWidth > 0 && (
        <div 
          ref={topScrollRef}
          onScroll={handleTopScroll}
          style={{ 
            overflowX: 'auto', 
            overflowY: 'hidden',
            border: '1px solid var(--border-color)',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            backgroundColor: 'var(--surface-color)'
          }}
        >
          <div style={{ width: `${tableWidth}px`, height: '1px' }}></div>
        </div>
      )}

      <div className="table-container" style={{ flexGrow: 1, marginTop: '0', borderRadius: '0 0 8px 8px' }} ref={tableContainerRef} onScroll={handleTableScroll}>
        <table ref={tableRef}>
          <thead>
            <tr>
              <th style={{ width: '110px' }}>狀態</th>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {books.map((book, index) => {
              // Barcode calculations
              const allBarcodes = book._searchableBarcodes || [];
              const scannedBarcodes = book._scannedBarcodes || (book.isReceived ? allBarcodes : []);
              const isAllBarcodesReceived = allBarcodes.length > 0 && allBarcodes.every(b => scannedBarcodes.includes(b));
              const isPartialBarcodesReceived = !isAllBarcodesReceived && scannedBarcodes.length > 0;

              // ISBN calculations
              const targetQty = book._targetQuantity || 1;
              const scannedISBNCount = book._scannedISBNCount ?? (book.isReceived ? targetQty : 0);
              const isAllISBNReceived = scannedISBNCount >= targetQty && targetQty > 0;
              const isPartialISBNReceived = !isAllISBNReceived && scannedISBNCount > 0;

              const isAllReceived = receivingMode === 'barcode' ? isAllBarcodesReceived : isAllISBNReceived;
              const isPartialReceived = receivingMode === 'barcode' ? isPartialBarcodesReceived : isPartialISBNReceived;

              return (
                <tr key={book['登錄號'] + '-' + index} style={{ backgroundColor: isAllReceived ? 'rgba(16, 185, 129, 0.05)' : isPartialReceived ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                  <td>
                    {isAllReceived ? (
                      <span className="status-badge received">
                        <CheckCircle size={14} /> 已點收
                      </span>
                    ) : isPartialReceived ? (
                      <span className="status-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <Clock size={14} /> 部分點收 ({receivingMode === 'barcode' ? `${scannedBarcodes.length}/${allBarcodes.length}` : `${scannedISBNCount}/${targetQty}`})
                      </span>
                    ) : (
                      <span className="status-badge pending">
                        <Clock size={14} /> 未點收
                      </span>
                    )}
                  </td>
                  {columns.map(col => {
                    const isBarcodeCol = col === '登錄號';
                    const isISBNCol = col === 'ISBN';

                    return (
                      <td 
                        key={col}
                        style={{
                          ...(col === '題名' ? { minWidth: '200px', maxWidth: '400px', whiteSpace: 'normal', wordBreak: 'break-word' } : {}),
                          ...(isBarcodeCol ? { minWidth: '170px' } : {}),
                          ...(isISBNCol ? { minWidth: '140px' } : {}),
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
                            color: (receivingMode === 'barcode' && isBarcodeCol && !isAllReceived && allBarcodes.length <= 1) ||
                                   (receivingMode === 'isbn' && isISBNCol && !isAllReceived && targetQty <= 1)
                                     ? '#ef4444' 
                                     : 'inherit'
                          }}
                          onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                          onMouseLeave={(e) => { if (document.activeElement !== e.target) e.target.style.background = 'transparent'; }}
                          onMouseEnter={(e) => { if (document.activeElement !== e.target) e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                        >
                          {/* Barcode column custom rendering in barcode mode */}
                          {receivingMode === 'barcode' && isBarcodeCol && allBarcodes.length > 1 ? (
                            allBarcodes.map((bCode, bIdx) => {
                              const isBScanned = scannedBarcodes.includes(bCode);
                              return (
                                <div key={bIdx} style={{ color: isBScanned ? '#10b981' : '#ef4444', fontWeight: isBScanned ? 400 : 600 }}>
                                  {isBScanned ? `✓ ${bCode}` : `✗ ${bCode} (未點)`}
                                </div>
                              );
                            })
                          ) : receivingMode === 'isbn' && isISBNCol ? (
                            /* ISBN column custom rendering in ISBN mode */
                            <div style={{ color: isAllReceived ? '#10b981' : isPartialReceived ? '#f59e0b' : '#ef4444', fontWeight: isAllReceived ? 400 : 600 }}>
                              {isAllReceived ? `✓ ${book[col]}` : `✗ ${book[col]}`}
                              {targetQty > 1 && (
                                <span style={{ fontSize: '0.85em', marginLeft: '4px', opacity: 0.9 }}>
                                  ({scannedISBNCount}/{targetQty}冊)
                                </span>
                              )}
                            </div>
                          ) : (
                            book[col] || ''
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
