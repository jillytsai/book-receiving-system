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
      padding: '1.5rem 1.8rem', 
      maxWidth: '720px', 
      margin: '0 auto', 
      position: 'relative',
      borderRadius: '16px',
      backgroundColor: 'rgba(26, 32, 48, 0.98)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
      border: '1.5px solid var(--accent-primary)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.65rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
          <Plus size={22} color="var(--accent-primary)" />
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
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="關閉"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Step 1: Mode Select */}
      <div style={{ marginBottom: '1.1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          步驟 1：請選擇點收方式
        </label>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <button
            type="button"
            className="btn"
            onClick={() => onModeChange('barcode')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              fontWeight: receivingMode === 'barcode' ? '600' : 'normal',
              backgroundColor: receivingMode === 'barcode' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: receivingMode === 'barcode' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
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
              flex: 1,
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              fontWeight: receivingMode === 'isbn' ? '600' : 'normal',
              backgroundColor: receivingMode === 'isbn' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: receivingMode === 'isbn' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Hash size={20} />
            ISBN 點收
          </button>
        </div>
      </div>

      {/* Step 2: Upload Drop Area */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          步驟 2：上傳交書清單 Excel
        </label>
        <div 
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          style={{ padding: '1.6rem 1.2rem', minHeight: '130px', borderRadius: '10px' }}
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
          <UploadCloud size={50} className="upload-icon" style={{ marginBottom: '0.5rem' }} />
          <p style={{ color: 'var(--text-primary)', margin: '0 0 0.35rem 0', fontWeight: 500, fontSize: '1.05rem' }}>
            點擊選擇檔案，或直接將 Excel 拖曳至此
          </p>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.88rem' }}>
            支援 .xlsx, .xls（可同時多選上傳）
          </p>
        </div>
      </div>
    </div>
  );
}
