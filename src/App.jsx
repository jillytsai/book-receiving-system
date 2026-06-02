import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import FileUpload from './components/FileUpload';
import ScannerInput from './components/ScannerInput';
import BookList from './components/BookList';
import Statistics from './components/Statistics';

function App() {
  // Initialize state from localStorage if available
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem('bookReceivingBooks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [originalFileName, setOriginalFileName] = useState(() => {
    return localStorage.getItem('bookReceivingFileName') || '';
  });
  
  const [successPulse, setSuccessPulse] = useState(false);

  // Auto-save whenever books or file name changes
  useEffect(() => {
    localStorage.setItem('bookReceivingBooks', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('bookReceivingFileName', originalFileName);
  }, [originalFileName]);

  const handleClearData = () => {
    if (window.confirm('確定要放棄目前的點收進度，並重新上傳清單嗎？')) {
      setBooks([]);
      setOriginalFileName('');
      localStorage.removeItem('bookReceivingBooks');
      localStorage.removeItem('bookReceivingFileName');
    }
  };

  const handleFileUpload = (file) => {
    setOriginalFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Read as 2D array to find the correct header row
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Find the header row (the one containing '登錄號')
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        if (rawData[i].some(cell => String(cell).includes('登錄號'))) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawData[headerRowIndex].map(h => String(h).trim());
      const dataRows = rawData.slice(headerRowIndex + 1);

      // Create object array and handle multiple barcodes in one cell
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

        initializedData.push({
          ...rowObj,
          '登錄號': rawBarcode,
          _searchableBarcodes: barcodes,
          isReceived: false,
          _original: { ...rowObj, '登錄號': rawBarcode }
        });
      });

      setBooks(initializedData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleScan = (barcode) => {
    let found = false;
    
    setBooks(prevBooks => {
      const newBooks = [...prevBooks];
      
      const bookIndex = newBooks.findIndex(book => 
        book._searchableBarcodes && book._searchableBarcodes.includes(barcode)
      );
      
      if (bookIndex !== -1) {
        found = true;
        newBooks[bookIndex] = { ...newBooks[bookIndex], isReceived: true };
        
        const scannedBook = newBooks.splice(bookIndex, 1)[0];
        newBooks.unshift(scannedBook);
        
        setSuccessPulse(true);
        setTimeout(() => setSuccessPulse(false), 1500);
      }
      
      return newBooks;
    });

    if (!found) {
      alert(`找不到登錄號: ${barcode}`);
    }
  };

  const handleExport = () => {
    if (books.length === 0) return;

    // Prepare data for export
    const exportData = books.map(book => {
      const { isReceived, _searchableBarcodes, _original, ...rest } = book;
      
      // Remove unwanted columns for export
      delete rest['箱號'];
      delete rest['紙插序號'];

      // Replace any whitespace (newlines, spaces) in barcodes with "、"
      let exportBarcode = String(rest['登錄號'] || '').trim();
      exportBarcode = exportBarcode.replace(/\s+/g, '、');

      return {
        ...rest,
        '登錄號': exportBarcode,
        '點收狀態': isReceived ? '已到館' : '未到館'
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

    // Set specific column widths to fit A4 landscape
    const headerWidths = {
      '序號': 4.5,
      'ISBN': 13,
      '登錄號': 16,
      '題名': 20,
      '著者': 10,
      '出版者': 10,
      '出版年': 6,
      '定價': 6,
      '數量': 4,
      '冊數': 4,
      '總冊數': 5,
      '折扣': 6,
      '售價': 6,
      '總售價': 6,
      '介購單位': 8,
      '介購人': 8,
      '是否預約': 6,
      '置放地點': 10,
      '書目紀錄ID(記錄識別欄) 001段': 10,
      '書目紀錄ID(記錄識別欄)': 10,
      '備註': 8,
      '點收狀態': 8
    };
    worksheet['!cols'] = headers.map(h => ({ wch: headerWidths[h] || 10 }));

    // Setup page for A4 landscape printing, fitting to 1 page wide
    worksheet['!pageSetup'] = { paperSize: 9, orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 };
    worksheet['!fitToPage'] = true;
    worksheet['!margins'] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

    for(let R = range.s.r; R <= range.e.r; ++R) {
      const originalBook = R > 0 ? (books[R - 1]?._original || {}) : {};
      
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

        // Apply base styles: font size 9, wrap text, vertical top alignment
        if (!cell.s) cell.s = {};
        if (!cell.s.font) cell.s.font = { sz: 9 };
        else cell.s.font.sz = 9;
        
        if (!cell.s.alignment) cell.s.alignment = { wrapText: true, vertical: 'top' };
        else {
           cell.s.alignment.wrapText = true;
           cell.s.alignment.vertical = 'top';
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
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '點收結果');

    const outFileName = originalFileName 
      ? originalFileName.replace(/\.[^/.]+$/, "") + '_點收結果.xlsx' 
      : '圖書點收結果.xlsx';

    XLSX.writeFile(workbook, outFileName);
  };

  const handleEditBook = (index, key, newValue) => {
    setBooks(prevBooks => {
      const newBooks = [...prevBooks];
      newBooks[index] = { ...newBooks[index], [key]: newValue };
      
      // If they edited the barcode, we must update the searchable array too
      if (key === '登錄號') {
         newBooks[index]._searchableBarcodes = String(newValue).trim().split(/\s+/).filter(b => b);
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
        <p>上傳清單並使用條碼機快速核對到館狀態</p>
      </header>

      <main>
        {books.length === 0 ? (
          <FileUpload onFileUpload={handleFileUpload} />
        ) : (
          <div className="animate-fade-in">
            <ScannerInput onScan={handleScan} successPulse={successPulse} />
            <Statistics 
              total={totalBooks} 
              received={receivedBooks} 
              onExport={handleExport} 
              onClear={handleClearData}
            />
            <BookList books={books} onEditBook={handleEditBook} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
