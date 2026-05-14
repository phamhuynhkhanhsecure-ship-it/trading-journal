import { useEffect, useState } from 'react';

interface TiltModeOverlayProps {
  maxDailyLoss: number;
  currentLoss: number;
}

export default function TiltModeOverlay({ maxDailyLoss, currentLoss }: TiltModeOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds cool-down example
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  if (dismissed) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, backdropFilter: 'blur(20px)', background: 'rgba(255, 68, 68, 0.4)' }}>
      <div className="modal" style={{ maxWidth: 500, background: 'var(--bg-card)', border: '2px solid #ff4444', padding: 40, borderRadius: 12, textAlign: 'center' }}>
        <h1 style={{ fontSize: 64, margin: '0 0 10px 0' }}>🚨</h1>
        <h2 style={{ color: '#ff4444', fontSize: 24, marginBottom: 15, textTransform: 'uppercase' }}>Tilt Mode Kích Hoạt</h2>
        <p style={{ color: 'var(--text-primary)', fontSize: 16, marginBottom: 25, lineHeight: 1.5 }}>
          Bạn đã lỗ <strong>${Math.abs(currentLoss).toFixed(2)}</strong> ngày hôm nay, vượt ngưỡng cho phép là <strong>${maxDailyLoss}</strong>.
          <br /><br />
          Cảm xúc của bạn lúc này không còn phù hợp để ra quyết định chính xác. Đừng cố gỡ gạc!
        </p>

        {timeLeft > 0 ? (
          <div style={{ background: 'var(--bg-main)', padding: 15, borderRadius: 8, fontSize: 18, color: 'var(--text-secondary)' }}>
            Vui lòng hít thở sâu trong... <strong>{timeLeft}s</strong>
          </div>
        ) : (
          <button 
            className="btn btn--primary" 
            style={{ background: '#ff4444', width: '100%', padding: 15, fontSize: 16, fontWeight: 'bold' }}
            onClick={() => setDismissed(true)}
          >
            Tôi Chấp Nhận Dừng Lại Hôm Nay
          </button>
        )}
      </div>
    </div>
  );
}
