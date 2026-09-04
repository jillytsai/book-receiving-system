import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import FileUpload from './components/FileUpload';
import ScannerInput from './components/ScannerInput';
import BookList from './components/BookList';
import Statistics from './components/Statistics';

const normalizeISBN = (str) => {
  if (!str) return '';
  return String(str).replace(/[^0-9Xx]/g, '').toUpperCase();
};

function App() {
  const [receivingMode, setReceivingMode] = useState(() => {
    try {
      return localStorage.getItem('bookReceivingMode') || 'barcode';
    } catch (e) {
      return 'barcode';
    }
  });

  // Initialize state from localStorage if available
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem('bookReceivingBooks');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map(b => {
        const barcodes = b._searchableBarcodes || [];
        const rawISBN = String(b['ISBN'] || '').trim();
        const isbnList = b._searchableISBNs || (rawISBN ? [normalizeISBN(rawISBN)].filter(Boolean) : []);
        const qty = b._targetQuantity || parseInt(String(b['數量'] || b['冊數'] || '1').trim(), 10) || Math.max(barcodes.length, 1);

        return {
          ...b,
          _searchableBarcodes: barcodes,
          _scannedBarcodes: b._scannedBarcodes || (b.isReceived ? barcodes : []),
          _searchableISBNs: isbnList,
          _scannedISBNCount: b._scannedISBNCount ?? (b.isReceived ? qty : 0),
          _targetQuantity: qty
        };
      });
    } catch (e) {
      console.warn(e);
      return [];
    }
  });
  
  const [originalFileName, setOriginalFileName] = useState(() => {
    return localStorage.getItem('bookReceivingFileName') || '';
  });
  
  const [successPulse, setSuccessPulse] = useState(false);

  // Auto-save whenever books, mode, or file name changes
  useEffect(() => {
    try {
      localStorage.setItem('bookReceivingMode', receivingMode);
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  }, [receivingMode]);

  useEffect(() => {
    try {
      localStorage.setItem('bookReceivingBooks', JSON.stringify(books));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem('bookReceivingFileName', originalFileName);
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  }, [originalFileName]);

  const handleClearData = () => {
    if (window.confirm('確定要放棄目前的點收進度，並重新上傳清單嗎？')) {
      setBooks([]);
      setOriginalFileName('');
      try {
        localStorage.removeItem('bookReceivingBooks');
        localStorage.removeItem('bookReceivingFileName');
      } catch (e) {
        console.warn('localStorage remove failed:', e);
      }
    }
  };

  const handleFileUpload = (file) => {
    try {
      setOriginalFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Read as 2D array to find the correct header row
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          // Find the header row (the one containing '登錄號' or 'ISBN')
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(20, rawData.length); i++) {
            if (rawData[i].some(cell => String(cell).includes('登錄號') || String(cell).includes('ISBN'))) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
            alert('在 Excel 的前 20 列中找不到「登錄號」或「ISBN」欄位，請確認清單格式是否正確！');
            return;
          }

          const headers = rawData[headerRowIndex].map(h => String(h).replace(/\s+/g, ' ').trim());
          const dataRows = rawData.slice(headerRowIndex + 1);

          // Create object array and handle multiple barcodes / ISBNs in one cell
          const initializedData = [];
          dataRows.forEach(row => {
            if (!row.some(cell => cell !== '')) return; // Skip completely empty rows
            
            let rowObj = {};
            headers.forEach((header, index) => {
              if (header) {
                rowObj[header] = row[index];
              }
            });

            // Skip the total row at the bottom
            const title = String(rowObj['題名'] || '').trim();
            const isbn = String(rowObj['ISBN'] || '').trim();
            
            if (!title && !isbn) {
              return;
            }

            const rawBarcode = String(rowObj['登錄號'] || '').trim();
            const barcodes = rawBarcode.split(/\s+/).filter(b => b);

            const rawISBN = String(rowObj['ISBN'] || '').trim();
            const normalized = normalizeISBN(rawISBN);
            const isbnList = rawISBN.split(/[\s,;、\n\r]+/).map(normalizeISBN).filter(Boolean);
            const parsedQty = parseInt(String(rowObj['數量'] || rowObj['冊數'] || '1').trim(), 10) || 1;
            const targetQty = Math.max(parsedQty, barcodes.length, 1);

            initializedData.push({
              ...rowObj,
              '登錄號': rawBarcode,
              _searchableBarcodes: barcodes,
              _scannedBarcodes: [],
              _searchableISBNs: isbnList.length > 0 ? isbnList : (normalized ? [normalized] : []),
              _scannedISBNCount: 0,
              _targetQuantity: targetQty,
              isReceived: false,
              _original: { ...rowObj, '登錄號': rawBarcode }
            });
          });

          if (initializedData.length === 0) {
            alert('上傳的 Excel 檔案中沒有讀取到任何書籍資料！');
            return;
          }

          setBooks(initializedData);
        } catch (err) {
          console.error('檔案解析失敗:', err);
          alert('Excel 檔案解析失敗：' + err.message);
        }
      };
      reader.onerror = (err) => {
        console.error('檔案讀取失敗:', err);
        alert('讀取檔案失敗，請重新嘗試！');
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      alert('上傳失敗：' + err.message);
    }
  };

  const handleScan = (inputVal) => {
    let found = false;
    const cleanInput = String(inputVal).trim();
    if (!cleanInput) return;
    
    setBooks(prevBooks => {
      const newBooks = [...prevBooks];
      
      if (receivingMode === 'barcode') {
        // --- 條碼（登錄號）點收模式 ---
        const bookIndex = newBooks.findIndex(book => 
          book._searchableBarcodes && book._searchableBarcodes.includes(cleanInput)
        );
        
        if (bookIndex !== -1) {
          found = true;
          const targetBook = newBooks[bookIndex];
          const allBarcodes = targetBook._searchableBarcodes || [];
          const prevScanned = targetBook._scannedBarcodes || [];
          const nextScanned = prevScanned.includes(cleanInput) ? prevScanned : [...prevScanned, cleanInput];
          const isAllReceived = allBarcodes.length > 0 && allBarcodes.every(b => nextScanned.includes(b));

          newBooks[bookIndex] = {
            ...targetBook,
            _scannedBarcodes: nextScanned,
            isReceived: isAllReceived
          };
          
          const scannedBook = newBooks.splice(bookIndex, 1)[0];
          newBooks.unshift(scannedBook);
          
          setSuccessPulse(true);
          setTimeout(() => setSuccessPulse(false), 1500);
        }
      } else {
        // --- ISBN 點收模式 ---
        const scannedCleanISBN = normalizeISBN(cleanInput);
        
        // 尋找符合該 ISBN 且尚未點滿數量的書目
        let bookIndex = newBooks.findIndex(book => {
          const isMatch = book._searchableISBNs && book._searchableISBNs.some(isbn => {
            if (!isbn || !scannedCleanISBN) return false;
            return isbn === scannedCleanISBN || scannedCleanISBN.includes(isbn) || isbn.includes(scannedCleanISBN);
          });
          const targetQty = book._targetQuantity || 1;
          const currentCount = book._scannedISBNCount || 0;
          return isMatch && currentCount < targetQty;
        });

        // 若該 ISBN 都已點收滿額，再次掃描時提示
        if (bookIndex === -1) {
          const alreadyFullIndex = newBooks.findIndex(book => 
            book._searchableISBNs && book._searchableISBNs.some(isbn => {
              if (!isbn || !scannedCleanISBN) return false;
              return isbn === scannedCleanISBN || scannedCleanISBN.includes(isbn) || isbn.includes(scannedCleanISBN);
            })
          );
          if (alreadyFullIndex !== -1) {
            found = true;
            alert(`⚠️ ISBN: ${cleanInput} 的書籍（共 ${newBooks[alreadyFullIndex]._targetQuantity || 1} 冊）已全數點收完成！`);
            return prevBooks;
          }
        }

        if (bookIndex !== -1) {
          found = true;
          const targetBook = newBooks[bookIndex];
          const targetQty = targetBook._targetQuantity || 1;
          const nextCount = (targetBook._scannedISBNCount || 0) + 1;
          const isAllReceived = nextCount >= targetQty;

          newBooks[bookIndex] = {
            ...targetBook,
            _scannedISBNCount: nextCount,
            isReceived: isAllReceived
          };

          const scannedBook = newBooks.splice(bookIndex, 1)[0];
          newBooks.unshift(scannedBook);

          setSuccessPulse(true);
          setTimeout(() => setSuccessPulse(false), 1500);
        }
      }
      
      return newBooks;
    });

    if (!found) {
      if (receivingMode === 'barcode') {
        alert(`找不到登錄號條碼: ${cleanInput}`);
      } else {
        alert(`找不到 ISBN: ${cleanInput}`);
      }
    }
  };

  const handleExport = () => {
    if (books.length === 0) return;

    // Prepare data for export
    const exportData = books.map(book => {
      const { isReceived, _searchableBarcodes, _scannedBarcodes, _searchableISBNs, _scannedISBNCount, _targetQuantity, _original, ...rest } = book;
      
      // Remove unwanted columns for export
      delete rest['箱號'];
      delete rest['紙插序號'];

      // Replace any whitespace (newlines, spaces) in barcodes with "、"
      let exportBarcode = String(rest['登錄號'] || '').trim();
      exportBarcode = exportBarcode.replace(/\s+/g, '、');

      let statusText = '未到館';
      if (receivingMode === 'barcode') {
        const allBarcodes = _searchableBarcodes || [];
        const scanned = _scannedBarcodes || [];
        const missingBarcodes = allBarcodes.filter(b => !scanned.includes(b));
        const isAllReceived = allBarcodes.length > 0 && missingBarcodes.length === 0;
        
        if (isAllReceived) {
          statusText = '已到館';
        } else if (scanned.length > 0) {
          statusText = `部分到館 (缺: ${missingBarcodes.join('、')})`;
        }
      } else {
        // ISBN 模式
        const targetQty = _targetQuantity || 1;
        const currentCount = _scannedISBNCount || 0;
        if (currentCount >= targetQty && targetQty > 0) {
          statusText = '已到館';
        } else if (currentCount > 0) {
          statusText = `部分到館 (${currentCount}/${targetQty})`;
        } else {
          statusText = '未到館';
        }
      }

      return {
        ...rest,
        '登錄號': exportBarcode,
        '點收狀態': statusText
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Apply formatting to cells
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const headers = [];
    for(let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({c: C, r: 0})];
      if (cell) headers[C] = cell.v;
    }

    // Set specific column widths to fit A4 landscape (tightly packed)
    const headerWidths = {
      '序號': 4,
      'ISBN': 13,
      '登錄號': 16,
      '題名': 18,
      '著者': 8,
      '出版者': 8,
      '出版年': 5,
      '定價': 5,
      '數量': 3.5,
      '冊數': 3.5,
      '總冊數': 4.5,
      '折扣': 5,
      '售價': 5,
      '總售價': 5,
      '介購單位': 7,
      '介購人': 6,
      '是否預約': 5,
      '置放地點': 9,
      '書目紀錄ID(記錄識別欄) 001段': 8,
      '書目紀錄ID(記錄識別欄)': 8,
      '備註': 6,
      '點收狀態': 8
    };
    worksheet['!cols'] = headers.map(h => ({ wch: headerWidths[h] || 8 }));

    // Setup page for A4 landscape printing, fitting to 1 page wide
    worksheet['!pageSetup'] = { paperSize: 9, orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 };
    worksheet['!fitToPage'] = true;
    worksheet['!margins'] = { left: 0.1, right: 0.1, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 };

    const borderThin = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    for(let R = range.s.r; R <= range.e.r; ++R) {
      const originalBook = R > 0 ? (books[R - 1]?._original || {}) : {};
      const currentBook = R > 0 ? books[R - 1] : null;
      
      for(let C = range.s.c; C <= range.e.c; ++C) {
        const colName = headers[C];
        const cellAddress = XLSX.utils.encode_cell({c: C, r: R});
        const cell = worksheet[cellAddress];
        
        if (!cell) continue;

        // Force ISBN and 登錄號 to string to prevent scientific notation in Excel
        if (colName === 'ISBN' || colName === '登錄號') {
           cell.t = 's';
           cell.v = String(cell.v);
           cell.z = '@';
        }

        // Apply base styles: font size 8, wrap text, vertical top alignment, and full borders
        if (!cell.s) cell.s = {};
        cell.s.border = borderThin;

        if (!cell.s.font) cell.s.font = { sz: 8 };
        else cell.s.font.sz = 8;
        
        if (!cell.s.alignment) cell.s.alignment = { wrapText: true, vertical: 'top' };
        else {
           cell.s.alignment.wrapText = true;
           cell.s.alignment.vertical = 'top';
        }

        // Style header row
        if (R === 0) {
          cell.s.font.bold = true;
          cell.s.fill = { fgColor: { rgb: 'F2F2F2' } };
        }

        // Highlight modified cells in red (skip header row)
        if (R > 0 && originalBook[colName] !== undefined) {
           let originalValue = String(originalBook[colName]).trim();
           let currentValue = String(cell.v).trim();
           
           // Normalize 登錄號 for comparison because we injected '、'
           if (colName === '登錄號') {
             originalValue = originalValue.replace(/\s+/g, '、');
           }

           if (originalValue !== currentValue) {
             cell.s.font.color = { rgb: "FF0000" };
           }
        }

        // Highlight '未到館' or '部分到館' in red
        if (R > 0 && colName === '點收狀態') {
           if (cell.v === '未到館' || String(cell.v).startsWith('部分到館')) {
             cell.s.font.color = { rgb: "FF0000" };
           }
        }

        // Barcode mode: Highlight unreceived or partially received barcode ('登錄號') in red
        if (R > 0 && receivingMode === 'barcode' && colName === '登錄號' && currentBook) {
           const allBarcodes = currentBook._searchableBarcodes || [];
           const scanned = currentBook._scannedBarcodes || [];
           const isAllReceived = allBarcodes.length > 0 && allBarcodes.every(b => scanned.includes(b));
           if (!isAllReceived) {
             cell.s.font.color = { rgb: "FF0000" };
           }
        }

        // ISBN mode: Highlight unreceived or partially received ISBN in red
        if (R > 0 && receivingMode === 'isbn' && colName === 'ISBN' && currentBook) {
           const targetQty = currentBook._targetQuantity || 1;
           const currentCount = currentBook._scannedISBNCount || 0;
           if (currentCount < targetQty) {
             cell.s.font.color = { rgb: "FF0000" };
           }
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '點收結果');

    const outFileName = originalFileName 
      ? originalFileName.replace(/\.[^/.]+$/, "") + '_點收結果.xlsx' 
      : '圖書點收結果.xlsx';

    XLSX.writeFile(workbook, outFileName);

    // Send email with Excel attachment in background
    const sendEmailReport = async () => {
      try {
        const base64Data = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: outFileName,
            fileBase64: base64Data,
            toEmail: 'jilly@mail.nptu.edu.tw',
            stats: {
              total: totalBooks,
              received: receivedBooks,
              pending: totalBooks - receivedBooks
            }
          })
        });

        const result = await res.json();
        if (res.ok) {
          alert(`✅ Excel 檔案已下載！\n📧 點收報告已自動發送至 ${result.sentTo || '您的 Email'}，請查收信箱！`);
        } else {
          console.warn('Email 發送提示:', result);
          if (result.error && result.error.includes('RESEND_API_KEY')) {
            alert('✅ Excel 檔案已下載！\n（提示：尚未在 Vercel 設定 RESEND_API_KEY，設定後將可自動發送 Email 至 jilly@mail.nptu.edu.tw）');
          } else {
            alert(`✅ Excel 檔案已下載！\n（Email 發送提示：${result.error || '請確認發信設定'}）`);
          }
        }
      } catch (err) {
        console.warn('發送郵件失敗:', err);
      }
    };
    sendEmailReport();
  };

  const handleEditBook = (index, key, newValue) => {
    setBooks(prevBooks => {
      const newBooks = [...prevBooks];
      newBooks[index] = { ...newBooks[index], [key]: newValue };
      
      // If they edited the barcode, we must update the searchable array too
      if (key === '登錄號') {
         const newBarcodes = String(newValue).trim().split(/\s+/).filter(b => b);
         newBooks[index]._searchableBarcodes = newBarcodes;
         const currentScanned = newBooks[index]._scannedBarcodes || [];
         const filteredScanned = currentScanned.filter(b => newBarcodes.includes(b));
         newBooks[index]._scannedBarcodes = filteredScanned;
         if (receivingMode === 'barcode') {
           newBooks[index].isReceived = newBarcodes.length > 0 && newBarcodes.every(b => filteredScanned.includes(b));
         }
      }

      // If they edited ISBN
      if (key === 'ISBN') {
        const rawISBN = String(newValue).trim();
        const normalized = normalizeISBN(rawISBN);
        const isbnList = rawISBN.split(/[\s,;、\n\r]+/).map(normalizeISBN).filter(Boolean);
        newBooks[index]._searchableISBNs = isbnList.length > 0 ? isbnList : (normalized ? [normalized] : []);
      }

      // If they edited quantity
      if (key === '數量' || key === '冊數') {
        const parsed = parseInt(String(newValue).trim(), 10) || 1;
        newBooks[index]._targetQuantity = Math.max(parsed, (newBooks[index]._searchableBarcodes || []).length, 1);
        if (receivingMode === 'isbn') {
          newBooks[index].isReceived = (newBooks[index]._scannedISBNCount || 0) >= newBooks[index]._targetQuantity;
        }
      }

      return newBooks;
    });
  };

  const totalBooks = books.length;
  const receivedBooks = books.filter(book => book.isReceived).length;

  return (
    <div className="container">
      <header className="header">
        <h1>圖書點收系統</h1>
        <p>上傳清單並使用條碼機快速核對到館狀態（支援條碼點收與 ISBN 點收）</p>
      </header>

      <main>
        {books.length === 0 ? (
          <FileUpload 
            onFileUpload={handleFileUpload} 
            receivingMode={receivingMode} 
            onModeChange={setReceivingMode} 
          />
        ) : (
          <div className="animate-fade-in">
            <ScannerInput 
              onScan={handleScan} 
              successPulse={successPulse} 
              receivingMode={receivingMode}
              onModeChange={setReceivingMode}
            />
            <Statistics 
              total={totalBooks} 
              received={receivedBooks} 
              onExport={handleExport} 
              onClear={handleClearData}
            />
            <BookList 
              books={books} 
              onEditBook={handleEditBook} 
              receivingMode={receivingMode}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
