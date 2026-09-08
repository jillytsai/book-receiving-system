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
              <th style={{ width: '110px', minWidth: '100px' }}>狀態</th>
              {columns.map(col => {
                const isTitle = col === '題名' || col === '書名' || col === '正題名' || col.includes('題名') || col.includes('書名');
                const isLink = col.includes('連結') || col.includes('網址') || col.toLowerCase().includes('url') || col.toLowerCase().includes('link');
                const isBarcode = col === '登錄號';
                const isISBN = col === 'ISBN';
                const isNumberCol = col === '序號' || col === '編號';

                let thStyle = {};
                if (isTitle) {
                  thStyle = { minWidth: '220px', maxWidth: '380px' };
                } else if (isLink) {
                  thStyle = { width: '110px', minWidth: '95px', maxWidth: '130px' };
                } else if (isBarcode) {
                  thStyle = { minWidth: '160px' };
                } else if (isISBN) {
                  thStyle = { minWidth: '140px' };
                } else if (isNumberCol) {
                  thStyle = { width: '55px', minWidth: '45px' };
                } else if (col.includes('數量') || col.includes('館藏') || col.includes('冊數')) {
                  thStyle = { minWidth: '90px', maxWidth: '120px' };
                }

                return (
                  <th key={col} style={thStyle}>{col}</th>
                );
              })}
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
                    const isTitle = col === '題名' || col === '書名' || col === '正題名' || col.includes('題名') || col.includes('書名');
                    const cellVal = book[col];
                    const isRawUrl = String(cellVal || '').trim().startsWith('http://') || String(cellVal || '').trim().startsWith('https://');
                    const isLink = col.includes('連結') || col.includes('網址') || col.toLowerCase().includes('url') || col.toLowerCase().includes('link') || isRawUrl;
                    const isBarcodeCol = col === '登錄號';
                    const isISBNCol = col === 'ISBN';
                    const isNumberCol = col === '序號' || col === '編號';

                    let tdStyle = { verticalAlign: 'top' };
                    if (isTitle) {
                      tdStyle = { ...tdStyle, minWidth: '220px', maxWidth: '380px', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 500, fontSize: '0.95rem' };
                    } else if (isLink) {
                      tdStyle = { ...tdStyle, width: '110px', minWidth: '95px', maxWidth: '130px' };
                    } else if (isBarcodeCol) {
                      tdStyle = { ...tdStyle, minWidth: '160px' };
                    } else if (isISBNCol) {
                      tdStyle = { ...tdStyle, minWidth: '140px' };
                    } else if (isNumberCol) {
                      tdStyle = { ...tdStyle, width: '55px', minWidth: '45px' };
                    } else if (col.includes('數量') || col.includes('館藏') || col.includes('冊數')) {
                      tdStyle = { ...tdStyle, minWidth: '90px', maxWidth: '120px' };
                    }

                    return (
                      <td 
                        key={col}
                        style={tdStyle}
                      >
                        {isLink && isRawUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '120px' }}>
                            <a
                              href={String(cellVal).trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#818cf8',
                                textDecoration: 'none',
                                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.3)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)'}
                              title={String(cellVal).trim()}
                            >
                              🔗 開啟連結
                            </a>
                          </div>
                        ) : (
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
                        )}
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
