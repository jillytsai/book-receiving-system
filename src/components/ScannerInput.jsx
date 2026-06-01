import { useState, useRef, useEffect } from 'react';
import { ScanLine } from 'lucide-react';

export default function ScannerInput({ onScan, successPulse }) {
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

  return (
    <div className={`glass-panel scanner-container animate-fade-in ${successPulse ? 'pulse-green' : ''}`}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ScanLine color="var(--accent-primary)" />
        條碼掃描區
      </h2>
      <div className="scanner-input-wrapper">
        <ScanLine size={20} className="scanner-icon" />
        <input
          ref={inputRef}
          type="text"
          className="scanner-input"
          placeholder="請在此刷條碼或輸入登錄號..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
      <div className="scanner-status">
        <span style={{ color: 'var(--text-secondary)' }}>
          提示：掃描器通常會自動送出 Enter。如手動輸入請按 Enter 送出。
        </span>
      </div>
    </div>
  );
}
