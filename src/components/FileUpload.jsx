import { useState } from 'react';
import { UploadCloud, Barcode, Hash, X, Plus } from 'lucide-react';

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
    <div className="glass-panel animate-fade-in" style={{ 
      padding: '2.2rem 2.6rem', 
      maxWidth: '920px', 
      margin: '0 auto', 
      position: 'relative',
      borderRadius: '18px',
      backgroundColor: 'rgba(26, 32, 48, 0.98)',
      boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
      border: '1.5px solid var(--accent-primary)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '0.85rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'white' }}>
          <Plus size={26} color="var(--accent-primary)" />
          {onCancel ? '新增批次清單' : '建立圖書點收批次'}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="關閉"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Step 1: Mode Select */}
      <div style={{ marginBottom: '1.4rem' }}>
        <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          步驟 1：請選擇點收方式
        </label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            className="btn"
            onClick={() => onModeChange('barcode')}
            style={{
              flex: 1,
              padding: '1rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              fontSize: '1.15rem',
              fontWeight: receivingMode === 'barcode' ? '600' : 'normal',
              backgroundColor: receivingMode === 'barcode' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: receivingMode === 'barcode' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Barcode size={24} />
            條碼（登錄號）點收
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => onModeChange('isbn')}
            style={{
              flex: 1,
              padding: '1rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              fontSize: '1.15rem',
              fontWeight: receivingMode === 'isbn' ? '600' : 'normal',
              backgroundColor: receivingMode === 'isbn' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: receivingMode === 'isbn' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Hash size={24} />
            ISBN 點收
          </button>
        </div>
      </div>

      {/* Step 2: Upload Drop Area */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.65rem', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          步驟 2：上傳交書清單 Excel
        </label>
        <div 
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          style={{ padding: '2.5rem 2rem', minHeight: '190px', borderRadius: '14px' }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input').click()}
        >
          <input 
            id="file-upload-input" 
            type="file" 
            multiple
            accept=".xlsx, .xls, .csv" 
            style={{ display: 'none' }} 
            onChange={handleChange} 
          />
          <UploadCloud size={64} className="upload-icon" style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-primary)', margin: '0 0 0.45rem 0', fontWeight: 500, fontSize: '1.25rem' }}>
            點擊選擇檔案，或直接將 Excel 拖曳至此
          </p>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
            支援 .xlsx, .xls（可同時多選上傳）
          </p>
        </div>
      </div>
    </div>
  );
}
