import { useState, useRef, useEffect } from 'react';
import { ScanLine, Barcode, Hash } from 'lucide-react';

export default function ScannerInput({ onScan, successPulse, receivingMode = 'barcode', onModeChange }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Keep focus on input for continuous scanning
  useEffect(() => {
    const focusInput = (e) => {
      // Don't steal focus if they clicked on something that needs focus (like the table cells)
      if (e && e.target) {
        const tag = e.target.tagName.toLowerCase();
        const isEditable = e.target.isContentEditable;
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || isEditable) {
          return;
        }
      }
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    focusInput();
    // Re-focus when clicking empty space
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        onScan(inputValue.trim());
        setInputValue(''); // Clear after scan
      }
    }
  };

  const isBarcode = receivingMode === 'barcode';

  return (
    <div className={`glass-panel scanner-container animate-fade-in ${successPulse ? 'pulse-green' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '500px', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
          <ScanLine color="var(--accent-primary)" />
          {isBarcode ? '條碼（登錄號）掃描區' : 'ISBN 掃描區'}
        </h2>

        {onModeChange && (
          <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.2rem', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => onModeChange('barcode')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                border: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: isBarcode ? 'var(--accent-primary)' : 'transparent',
                color: isBarcode ? 'white' : 'var(--text-secondary)',
                fontWeight: isBarcode ? 600 : 'normal'
              }}
            >
              <Barcode size={14} />
              條碼模式
            </button>
            <button
              type="button"
              onClick={() => onModeChange('isbn')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                border: 'none',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: !isBarcode ? 'var(--accent-primary)' : 'transparent',
                color: !isBarcode ? 'white' : 'var(--text-secondary)',
                fontWeight: !isBarcode ? 600 : 'normal'
              }}
            >
              <Hash size={14} />
              ISBN 模式
            </button>
          </div>
        )}
      </div>

      <div className="scanner-input-wrapper">
        <ScanLine size={20} className="scanner-icon" />
        <input
          ref={inputRef}
          type="text"
          className="scanner-input"
          placeholder={isBarcode ? "請在此刷條碼或輸入登錄號..." : "請在此刷書籍 ISBN 條碼或輸入 ISBN..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
      <div className="scanner-status">
        <span style={{ color: 'var(--text-secondary)' }}>
          {isBarcode 
            ? '提示：目前為【條碼模式】，掃描器刷入登錄號將自動送出 Enter。' 
            : '提示：目前為【ISBN 模式】，掃描器刷入書籍 ISBN 條碼將自動核對到館。'}
        </span>
      </div>
    </div>
  );
}
