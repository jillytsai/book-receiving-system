import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { Plus, X, Barcode, Hash, UploadCloud } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ScannerInput from './components/ScannerInput';
import BookList from './components/BookList';
import Statistics from './components/Statistics';
import BatchTabs from './components/BatchTabs';

const normalizeISBN = (str) => {
  if (!str) return '';
  return String(str).replace(/[^0-9Xx]/g, '').toUpperCase();
};

function App() {
  // Batches state initialized from localStorage
  const [batches, setBatches] = useState(() => {
    try {
      const savedBatches = localStorage.getItem('bookReceivingBatches');
      if (savedBatches) {
        const parsed = JSON.parse(savedBatches);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Migrate from old single-batch format if present
      const savedBooks = localStorage.getItem('bookReceivingBooks');
      const savedFileName = localStorage.getItem('bookReceivingFileName') || '第 1 批書單';
      const savedMode = localStorage.getItem('bookReceivingMode') || 'barcode';
      if (savedBooks) {
        const parsed = JSON.parse(savedBooks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [{
            id: 'batch-' + Date.now(),
            name: savedFileName.replace(/\.[^/.]+$/, ''),
            fileName: savedFileName,
            receivingMode: savedMode,
            books: parsed,
            createdAt: Date.now()
          }];
        }
      }
      return [];
    } catch (e) {
      console.warn('Failed to load batches from localStorage:', e);
      return [];
    }
  });

  const [activeBatchId, setActiveBatchId] = useState(() => {
    try {
      return localStorage.getItem('bookReceivingActiveBatchId') || '';
    } catch (e) {
      return '';
    }
  });

  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchMode, setNewBatchMode] = useState('barcode');
  const [successPulse, setSuccessPulse] = useState(false);

  // Synchronize activeBatchId when batches change
  useEffect(() => {
    if (batches.length === 0) {
      setActiveBatchId('');
      return;
    }
    const exists = batches.some(b => b.id === activeBatchId);
    if (!exists) {
      setActiveBatchId(batches[0].id);
    }
  }, [batches, activeBatchId]);

  // Persist batches & activeBatchId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bookReceivingBatches', JSON.stringify(batches));
    } catch (e) {
      console.warn('localStorage save batches failed:', e);
    }
  }, [batches]);

  useEffect(() => {
    try {
      localStorage.setItem('bookReceivingActiveBatchId', activeBatchId);
    } catch (e) {
      console.warn('localStorage save activeBatchId failed:', e);
    }
  }, [activeBatchId]);

  // Current active batch helper
  const isAllOverview = activeBatchId === 'all' && batches.length > 1;
  const activeBatch = batches.find(b => b.id === activeBatchId) || batches[0] || null;
  
  const currentBooks = isAllOverview
    ? batches.flatMap(batch => batch.books.map(b => ({ ...b, 來源批次: batch.name, _batchId: batch.id })))
    : (activeBatch?.books || []);

  const currentMode = activeBatch?.receivingMode || 'barcode';
  const totalBooks = currentBooks.length;
  const receivedBooks = currentBooks.filter(book => book.isReceived).length;

  const handleFileUpload = async (fileOrFiles) => {
    try {
      const fileList = Array.isArray(fileOrFiles)
        ? fileOrFiles
        : (fileOrFiles instanceof FileList ? Array.from(fileOrFiles) : [fileOrFiles]);

      if (!fileList || fileList.length === 0) return;

      const newBatches = [];

      for (const file of fileList) {
        const batchName = file.name.replace(/\.[^/.]+$/, "");
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          if (rawData[i].some(cell => String(cell).includes('登錄號') || String(cell).includes('ISBN'))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          alert(`檔案「${file.name}」在前 20 列中找不到「登錄號」或「ISBN」欄位，已跳過該檔案！`);
          continue;
        }

        const headers = rawData[headerRowIndex].map(h => String(h).replace(/\s+/g, ' ').trim());
        const dataRows = rawData.slice(headerRowIndex + 1);

        const initializedData = [];
        dataRows.forEach(row => {
          if (!row.some(cell => cell !== '')) return; // Skip completely empty rows

          let rowObj = {};
          headers.forEach((header, index) => {
            if (header) {
              rowObj[header] = row[index];
            }
          });

          const title = String(rowObj['題名'] || '').trim();
          const isbn = String(rowObj['ISBN'] || '').trim();
          if (!title && !isbn) return;

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

        if (initializedData.length > 0) {
          newBatches.push({
            id: 'batch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: batchName,
            fileName: file.name,
            receivingMode: newBatchMode,
            books: initializedData,
            createdAt: Date.now()
          });
        }
      }

      if (newBatches.length === 0) {
        alert('上傳的 Excel 檔案中沒有讀取到任何書籍資料！');
        return;
      }

      setBatches(prev => [...prev, ...newBatches]);
      setActiveBatchId(newBatches[0].id);
      setIsAddingBatch(false);
    } catch (err) {
      console.error('檔案處理失敗:', err);
      alert('檔案解析處理失敗：' + err.message);
    }
  };

  const handleScan = (inputVal) => {
    const cleanInput = String(inputVal).trim();
    if (!cleanInput) return;

    let foundBatchName = '';
    const mode = currentMode;

    // 1. Try matching in the currently active batch (or any batch if in overview mode)
    setBatches(prevBatches => {
      let matched = false;

      const updated = prevBatches.map(batch => {
        // If not in overview and not active batch, skip for primary scan
        if (!isAllOverview && batch.id !== activeBatch?.id) return batch;
        if (matched) return batch;

        const newBooks = [...batch.books];
        const batchMode = isAllOverview ? mode : batch.receivingMode;

        if (batchMode === 'barcode') {
          const bookIndex = newBooks.findIndex(book =>
            book._searchableBarcodes && book._searchableBarcodes.includes(cleanInput)
          );
          if (bookIndex !== -1) {
            matched = true;
            foundBatchName = batch.name;
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
          // ISBN mode
          const scannedCleanISBN = normalizeISBN(cleanInput);
          let bookIndex = newBooks.findIndex(book => {
            const isMatch = book._searchableISBNs && book._searchableISBNs.some(isbn => {
              if (!isbn || !scannedCleanISBN) return false;
              return isbn === scannedCleanISBN || scannedCleanISBN.includes(isbn) || isbn.includes(scannedCleanISBN);
            });
            const targetQty = book._targetQuantity || 1;
            const currentCount = book._scannedISBNCount || 0;
            return isMatch && currentCount < targetQty;
          });

          if (bookIndex === -1) {
            const alreadyFull = newBooks.findIndex(book =>
              book._searchableISBNs && book._searchableISBNs.some(isbn =>
                isbn === scannedCleanISBN || scannedCleanISBN.includes(isbn) || isbn.includes(scannedCleanISBN)
              )
            );
            if (alreadyFull !== -1) {
              matched = true;
              foundBatchName = batch.name;
              alert(`⚠️ 在「${batch.name}」中，ISBN: ${cleanInput} 的書籍已全數點收完成！`);
              return batch;
            }
          }

          if (bookIndex !== -1) {
            matched = true;
            foundBatchName = batch.name;
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

        return { ...batch, books: newBooks };
      });

      return updated;
    });

    if (foundBatchName) return;

    // 2. If not in overview and not found in active batch, check OTHER batches
    if (!isAllOverview) {
      const otherBatch = batches.find(b => {
        if (b.id === activeBatch?.id) return false;
        if (b.receivingMode === 'barcode') {
          return b.books.some(book => book._searchableBarcodes && book._searchableBarcodes.includes(cleanInput));
        } else {
          const scannedCleanISBN = normalizeISBN(cleanInput);
          return b.books.some(book =>
            book._searchableISBNs && book._searchableISBNs.some(isbn =>
              isbn === scannedCleanISBN || scannedCleanISBN.includes(isbn) || isbn.includes(scannedCleanISBN)
            )
          );
        }
      });

      if (otherBatch) {
        if (window.confirm(`💡 提示：在批次「${otherBatch.name}」中找到此書籍！\n是否立即切換至「${otherBatch.name}」進行點收？`)) {
          setActiveBatchId(otherBatch.id);
          setTimeout(() => {
            handleScan(cleanInput);
          }, 150);
        }
        return;
      }
    }

    // 3. Not found in any batch
    if (mode === 'barcode') {
      alert(`找不到登錄號條碼: ${cleanInput}`);
    } else {
      alert(`找不到 ISBN: ${cleanInput}`);
    }
  };

  const handleExport = () => {
    if (currentBooks.length === 0) return;

    const exportBatchName = isAllOverview 
      ? `全部批次合併_${batches.map(b => b.name).join('_')}`
      : (activeBatch?.name || '圖書點收');

    // Prepare data for export
    const exportData = currentBooks.map(book => {
      const { isReceived, _searchableBarcodes, _scannedBarcodes, _searchableISBNs, _scannedISBNCount, _targetQuantity, _original, _batchId, ...rest } = book;
      
      delete rest['箱號'];
      delete rest['紙插序號'];

      let exportISBN = String(rest['ISBN'] || '').replace(/^[✓✗Xx\s]+/, '').replace(/\s*\([^)]*\)$/, '').trim();
      let exportBarcode = String(rest['登錄號'] || '').replace(/^[✓✗Xx\s]+/, '').trim();
      exportBarcode = exportBarcode.replace(/\s+/g, '、');

      let statusText = '未到館';
      if (currentMode === 'barcode') {
        const allBarcodes = _searchableBarcodes || [];
        const scanned = _scannedBarcodes || [];
        const missingBarcodes = allBarcodes.filter(b => !scanned.includes(b));
        const isAllReceived = allBarcodes.length > 0 && missingBarcodes.length === 0;
        
        if (isAllReceived) {
          statusText = '已到館';
        } else if (scanned.length > 0) {
          statusText = `部分到館 (缺: ${missingBarcodes.join('、')})`;
        } else {
          statusText = '未到館';
        }
      } else {
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
        'ISBN': exportISBN,
        '登錄號': exportBarcode,
        '點收狀態': statusText
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const headers = [];
    for(let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({c: C, r: 0})];
      if (cell) headers[C] = cell.v;
    }

    const headerWidths = {
      '來源批次': 12,
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
      const currentBook = R > 0 ? currentBooks[R - 1] : null;
      
      // Check if current book is fully received
      let isBookReceived = false;
      if (currentBook) {
        if (currentMode === 'barcode') {
          const allBarcodes = currentBook._searchableBarcodes || [];
          const scanned = currentBook._scannedBarcodes || [];
          isBookReceived = allBarcodes.length > 0 && allBarcodes.every(b => scanned.includes(b));
        } else {
          const targetQty = currentBook._targetQuantity || 1;
          const currentCount = currentBook._scannedISBNCount || 0;
          isBookReceived = currentCount >= targetQty && targetQty > 0;
        }
      }

      for(let C = range.s.c; C <= range.e.c; ++C) {
        const colName = headers[C];
        const cellAddress = XLSX.utils.encode_cell({c: C, r: R});
        const cell = worksheet[cellAddress];
        
        if (!cell) continue;

        if (colName === 'ISBN' || colName === '登錄號') {
           cell.t = 's';
           cell.v = String(cell.v);
           cell.z = '@';
        }

        if (!cell.s) cell.s = {};
        cell.s.border = borderThin;

        if (!cell.s.font) cell.s.font = { sz: 8 };
        else cell.s.font.sz = 8;
        
        if (!cell.s.alignment) cell.s.alignment = { wrapText: true, vertical: 'top' };
        else {
           cell.s.alignment.wrapText = true;
           cell.s.alignment.vertical = 'top';
        }

        if (R === 0) {
          cell.s.font.bold = true;
          cell.s.font.color = { rgb: "000000" };
          cell.s.fill = { fgColor: { rgb: 'F2F2F2' } };
        } else {
          // Data rows
          if (isBookReceived) {
            // 已經點收完成：一律採用黑色顯示
            cell.s.font.color = { rgb: "000000" };
          } else {
            // 未點收部分（未到館）：採用紅色顯示
            if (colName === '點收狀態' || colName === 'ISBN' || colName === '登錄號') {
              cell.s.font.color = { rgb: "FF0000" };
            } else {
              cell.s.font.color = { rgb: "000000" };
            }
          }
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isAllOverview ? '全部批次合併' : (activeBatch?.name || '點收結果'));

    const outFileName = `${exportBatchName}_點收結果.xlsx`;

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

        const result = await res.json().catch(() => ({}));
        if (res.ok) {
          alert(`✅ Excel 檔案已下載！\n📧 點收報告已自動發送至 ${result.sentTo || '您的 Email'}，請查收信箱！`);
        } else {
          console.warn('Email 發送提示:', result);
          if (result.error && result.error.includes('RESEND_API_KEY')) {
            alert('✅ Excel 檔案已下載！\n\n⚠️【Email 自動寄信提示】\n尚未在 Vercel 設定 RESEND_API_KEY 環境變數。\n設定完成並 Redeploy 後，即可自動發送點收報告至信箱！');
          } else {
            alert(`✅ Excel 檔案已下載！\n\n⚠️【Email 發送提示】：${result.error || '發信伺服器未回應，請確認設定'}`);
          }
        }
      } catch (err) {
        console.warn('發送郵件失敗:', err);
        alert('✅ Excel 檔案已下載！\n\n⚠️【Email 發信提示】：\n若在「本地 localhost」測試無法直接發信，請至「線上網址」測試，並確認 Vercel 已設定 RESEND_API_KEY。');
      }
    };
    sendEmailReport();
  };

  const handleEditBook = (index, key, newValue) => {
    const targetBook = currentBooks[index];
    if (!targetBook) return;

    const targetBatchId = isAllOverview ? targetBook._batchId : activeBatchId;

    setBatches(prevBatches => {
      return prevBatches.map(batch => {
        if (batch.id !== targetBatchId) return batch;

        const newBooks = [...batch.books];
        const bookIdxInBatch = newBooks.findIndex(b => 
          (b['序號'] && b['序號'] === targetBook['序號'] && b['題名'] === targetBook['題名']) ||
          (b['登錄號'] === targetBook['登錄號'] && b['ISBN'] === targetBook['ISBN'])
        );

        const editIndex = bookIdxInBatch !== -1 ? bookIdxInBatch : index;
        if (!newBooks[editIndex]) return batch;

        newBooks[editIndex] = { ...newBooks[editIndex], [key]: newValue };
        
        if (key === '登錄號') {
           const newBarcodes = String(newValue).trim().split(/\s+/).filter(b => b);
           newBooks[editIndex]._searchableBarcodes = newBarcodes;
           const currentScanned = newBooks[editIndex]._scannedBarcodes || [];
           const filteredScanned = currentScanned.filter(b => newBarcodes.includes(b));
           newBooks[editIndex]._scannedBarcodes = filteredScanned;
           if (batch.receivingMode === 'barcode') {
             newBooks[editIndex].isReceived = newBarcodes.length > 0 && newBarcodes.every(b => filteredScanned.includes(b));
           }
        }

        if (key === 'ISBN') {
          const rawISBN = String(newValue).trim();
          const normalized = normalizeISBN(rawISBN);
          const isbnList = rawISBN.split(/[\s,;、\n\r]+/).map(normalizeISBN).filter(Boolean);
          newBooks[editIndex]._searchableISBNs = isbnList.length > 0 ? isbnList : (normalized ? [normalized] : []);
        }

        if (key === '數量' || key === '冊數') {
          const parsed = parseInt(String(newValue).trim(), 10) || 1;
          newBooks[editIndex]._targetQuantity = Math.max(parsed, (newBooks[editIndex]._searchableBarcodes || []).length, 1);
          if (batch.receivingMode === 'isbn') {
            newBooks[editIndex].isReceived = (newBooks[editIndex]._scannedISBNCount || 0) >= newBooks[editIndex]._targetQuantity;
          }
        }

        return { ...batch, books: newBooks };
      });
    });
  };

  const handleCloseBatch = (batchId) => {
    const target = batches.find(b => b.id === batchId);
    if (!target) return;
    if (window.confirm(`確定要關閉批次「${target.name}」嗎？該批次的點收資料將被清除。`)) {
      const remaining = batches.filter(b => b.id !== batchId);
      setBatches(remaining);
      if (activeBatchId === batchId) {
        setActiveBatchId(remaining.length > 0 ? remaining[0].id : '');
      }
    }
  };

  const handleClearCurrent = () => {
    if (isAllOverview) {
      if (window.confirm('確定要清空「所有批次」的點收資料嗎？')) {
        setBatches([]);
        setActiveBatchId('');
        try {
          localStorage.removeItem('bookReceivingBatches');
          localStorage.removeItem('bookReceivingActiveBatchId');
          localStorage.removeItem('bookReceivingBooks');
          localStorage.removeItem('bookReceivingFileName');
        } catch (e) {
          console.warn(e);
        }
      }
    } else {
      const target = batches.find(b => b.id === activeBatchId);
      const name = target ? target.name : '目前批次';
      if (window.confirm(`確定要清除目前批次「${name}」的點收資料嗎？\n（其他批次的資料將會保留）`)) {
        const remaining = batches.filter(b => b.id !== activeBatchId);
        setBatches(remaining);
        if (remaining.length > 0) {
          setActiveBatchId(remaining[0].id);
        } else {
          setActiveBatchId('');
          try {
            localStorage.removeItem('bookReceivingBatches');
            localStorage.removeItem('bookReceivingActiveBatchId');
            localStorage.removeItem('bookReceivingBooks');
            localStorage.removeItem('bookReceivingFileName');
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }
  };

  const handleModeChange = (newMode) => {
    if (batches.length === 0) {
      setNewBatchMode(newMode);
      return;
    }
    if (isAllOverview) {
      setBatches(prev => prev.map(b => ({ ...b, receivingMode: newMode })));
    } else {
      setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, receivingMode: newMode } : b));
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>圖書點收系統</h1>
        <p>上傳清單並使用條碼機快速核對到館狀態（支援多批次分頁、條碼點收與 ISBN 點收）</p>
      </header>

      <main>
        {batches.length === 0 ? (
          <FileUpload 
            onFileUpload={handleFileUpload} 
            receivingMode={newBatchMode} 
            onModeChange={setNewBatchMode} 
          />
        ) : (
          <div className="animate-fade-in">
            <BatchTabs 
              batches={batches}
              activeBatchId={activeBatchId}
              onSelectBatch={setActiveBatchId}
              onCloseBatch={handleCloseBatch}
              onAddNewBatch={() => {
                setNewBatchMode(currentMode);
                setIsAddingBatch(prev => !prev);
              }}
            />

            {/* Compact Modal Dialog for Adding New Batch */}
            {isAddingBatch && (
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '1rem',
                  paddingTop: '4rem',
                  overflowY: 'auto'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsAddingBatch(false);
                }}
              >
                <div style={{ maxWidth: '940px', width: '100%' }}>
                  <FileUpload 
                    onFileUpload={handleFileUpload} 
                    receivingMode={newBatchMode} 
                    onModeChange={setNewBatchMode} 
                    onCancel={() => setIsAddingBatch(false)}
                  />
                </div>
              </div>
            )}

            <ScannerInput 
              onScan={handleScan} 
              successPulse={successPulse} 
              receivingMode={currentMode}
              onModeChange={handleModeChange}
            />

            <Statistics 
              total={totalBooks} 
              received={receivedBooks} 
              onExport={handleExport} 
              onClear={handleClearCurrent}
              isAllOverview={isAllOverview}
              batchName={activeBatch?.name}
            />

            <BookList 
              books={currentBooks} 
              onEditBook={handleEditBook} 
              receivingMode={currentMode}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

