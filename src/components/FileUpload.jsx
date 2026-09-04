import { useState } from 'react';
import { UploadCloud, Barcode, Hash } from 'lucide-react';

export default function FileUpload({ onFileUpload, receivingMode, onModeChange, onCancel }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(Array.from(e.target.files));
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="btn"
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '1.5rem',
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer'
          }}
        >
          ← 返回現有批次
        </button>
      )}

      <div style={{ marginBottom: '1.5rem', textAlign: 'center', marginTop: onCancel ? '1.5rem' : '0' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          步驟 1：請選擇此批次的點收方式
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            type="button"
            className="btn"
            onClick={() => onModeChange('barcode')}
            style={{
              flex: '1',
              maxWidth: '260px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              fontWeight: receivingMode === 'barcode' ? '600' : 'normal',
              backgroundColor: receivingMode === 'barcode' ? 'var(--accent-primary)' : 'var(--surface-color-light)',
              color: 'white',
              border: receivingMode === 'barcode' ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
              boxShadow: receivingMode === 'barcode' ? '0 0 15px rgba(99, 102, 241, 0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Barcode size={20} />
            條碼（登錄號）點收
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => onModeChange('isbn')}
            style={{
              flex: '1',
              maxWidth: '260px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              fontWeight: receivingMode === 'isbn' ? '600' : 'normal',
              backgroundColor: receivingMode === 'isbn' ? 'var(--accent-primary)' : 'var(--surface-color-light)',
              color: 'white',
              border: receivingMode === 'isbn' ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
              boxShadow: receivingMode === 'isbn' ? '0 0 15px rgba(99, 102, 241, 0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Hash size={20} />
            ISBN 點收
          </button>
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {receivingMode === 'barcode' 
            ? '🏷️ 目前模式：以書籍貼上的「登錄號條碼」進行核對與掃描' 
            : '🔢 目前模式：以書籍封底「ISBN 條碼」進行核對與掃描'}
        </p>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
          步驟 2：上傳該批次交書清單 Excel
        </h3>
      </div>

      <div 
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload').click()}
      >
        <input 
          id="file-upload" 
          type="file" 
          multiple
          accept=".xlsx, .xls, .csv" 
          style={{ display: 'none' }} 
          onChange={handleChange} 
        />
        <UploadCloud size={56} className="upload-icon" />
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.4rem' }}>上傳圖書清單</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          拖曳一個或多個 Excel 檔案至此，或點擊選擇檔案 (.xlsx)
        </p>
      </div>
    </div>
  );
}
