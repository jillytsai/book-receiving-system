import { Download, Trash2 } from 'lucide-react';

export default function Statistics({ total, received, onExport, onClear }) {
  const percentage = total === 0 ? 0 : Math.round((received / total) * 100);

  return (
    <div className="glass-panel animate-fade-in stats-panel">
      <div className="stat-item">
        <span className="stat-label">總圖書數量</span>
        <span className="stat-value">{total}</span>
      </div>
      
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
      </div>
      
      <div className="stat-item" style={{ textAlign: 'center' }}>
        <span className="stat-label">已點收</span>
        <span className="stat-value highlight">{received}</span>
      </div>

      <div style={{ marginLeft: '2rem', display: 'flex', gap: '1rem' }}>
        <button className="btn btn-success" onClick={onExport} disabled={total === 0}>
          <Download size={18} />
          匯出 Excel
        </button>
        <button className="btn" onClick={onClear} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', border: '1px solid var(--error-color)' }}>
          <Trash2 size={18} />
          重新上傳
        </button>
      </div>
    </div>
  );
}
