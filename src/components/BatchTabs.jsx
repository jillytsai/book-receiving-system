import { Plus, X, Barcode, Hash, Layers, Sparkles } from 'lucide-react';

export default function BatchTabs({ 
  batches, 
  activeBatchId, 
  onSelectBatch, 
  onCloseBatch, 
  onAddNewBatch 
}) {
  if (!batches || batches.length === 0) return null;

  const totalAllBooks = batches.reduce((sum, b) => sum + (b.books?.length || 0), 0);
  const totalAllReceived = batches.reduce((sum, b) => sum + (b.books?.filter(item => item.isReceived)?.length || 0), 0);
  const totalAllPercent = totalAllBooks > 0 ? Math.round((totalAllReceived / totalAllBooks) * 100) : 0;
  const isAllActive = activeBatchId === 'all';

  return (
    <div className="batch-tabs-container animate-fade-in" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1rem',
      overflowX: 'auto',
      paddingBottom: '0.35rem',
      scrollbarWidth: 'thin'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', marginRight: '0.25rem' }}>
        <Layers size={16} />
        <span>批次切換：</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
        {/* All Batches Overview Tab (shown when multiple batches exist) */}
        {batches.length > 1 && (
          <div
            onClick={() => onSelectBatch('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: isAllActive ? 'var(--surface-color-light)' : 'rgba(255, 255, 255, 0.03)',
              border: isAllActive ? '1.5px solid #ec4899' : '1px solid var(--border-color)',
              boxShadow: isAllActive ? '0 2px 10px rgba(236, 72, 153, 0.3)' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              userSelect: 'none'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.75rem',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(236, 72, 153, 0.15)',
              color: '#ec4899',
              fontWeight: 600
            }}>
              <Sparkles size={12} />
              總覽
            </div>

            <span style={{
              fontWeight: isAllActive ? 600 : 'normal',
              color: isAllActive ? 'white' : 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              全部批次合併 ({batches.length} 批)
            </span>

            <span style={{
              fontSize: '0.75rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
              backgroundColor: totalAllReceived === totalAllBooks && totalAllBooks > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: totalAllReceived === totalAllBooks && totalAllBooks > 0 ? '#10b981' : 'var(--text-secondary)',
              fontWeight: 500
            }}>
              {totalAllReceived}/{totalAllBooks} ({totalAllPercent}%)
            </span>
          </div>
        )}

        {/* Individual Batch Tabs */}
        {batches.map(batch => {
          const isActive = batch.id === activeBatchId;
          const total = batch.books?.length || 0;
          const received = batch.books?.filter(b => b.isReceived)?.length || 0;
          const percent = total > 0 ? Math.round((received / total) * 100) : 0;
          const isBarcode = batch.receivingMode === 'barcode';

          return (
            <div
              key={batch.id}
              onClick={() => onSelectBatch(batch.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--surface-color-light)' : 'rgba(255, 255, 255, 0.03)',
                border: isActive ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.25)' : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                backgroundColor: isBarcode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isBarcode ? 'var(--accent-primary)' : '#10b981',
                fontWeight: 600
              }}>
                {isBarcode ? <Barcode size={12} /> : <Hash size={12} />}
                {isBarcode ? '條碼' : 'ISBN'}
              </div>

              <span style={{
                fontWeight: isActive ? 600 : 'normal',
                color: isActive ? 'white' : 'var(--text-secondary)',
                fontSize: '0.9rem',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} title={batch.name}>
                {batch.name}
              </span>

              <span style={{
                fontSize: '0.75rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '10px',
                backgroundColor: received === total && total > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: received === total && total > 0 ? '#10b981' : 'var(--text-secondary)',
                fontWeight: 500
              }}>
                {received}/{total} ({percent}%)
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseBatch(batch.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="關閉此批次"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={onAddNewBatch}
          className="btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            color: 'var(--accent-primary)',
            border: '1px dashed var(--accent-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          }}
        >
          <Plus size={15} />
          ＋ 新增批次
        </button>
      </div>
    </div>
  );
}