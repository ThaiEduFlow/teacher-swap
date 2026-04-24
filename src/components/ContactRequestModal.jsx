import React, { useState } from 'react';
import { Phone, Send, X, Shield } from 'lucide-react';

export default function ContactRequestModal({ targetPost, currentUser, onSubmit, onClose, loading }) {
  const [message, setMessage] = useState(
    `สวัสดีครับ/ค่ะ ผม/ดิฉัน ${currentUser?.displayName || ''} สนใจสลับตำแหน่งกับคุณ ขอแลกเบอร์ติดต่อเพื่อพูดคุยรายละเอียดได้ไหมครับ/คะ`
  );

  const handleSubmit = () => {
    onSubmit(message.trim());
  };

  return (
    <div className="tsm-modal-overlay" onClick={onClose}>
      <div className="tsm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ 
            width: 44, height: 44, background: '#eff6ff', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb'
          }}>
            <Phone size={22} />
          </div>
          <div>
            <h2 className="tsm-section-title" style={{ fontSize: 18, margin: 0 }}>ขอแลกเบอร์ติดต่อ</h2>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>กับ {targetPost.name}</p>
          </div>
        </div>

        <div style={{ 
          background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8,
          padding: 12, marginBottom: 16, display: 'flex', gap: 10, fontSize: 13, color: '#92400e'
        }}>
          <Shield size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>เพื่อความปลอดภัย:</strong> เบอร์โทรของทั้งสองฝ่ายจะถูกซ่อนไว้ 
            จนกว่าอีกฝ่ายจะกด <strong>ยินยอม</strong> เมื่อนั้นเบอร์จะถูกเปิดเผยให้ทั้งคู่เห็น
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="tsm-label">ข้อความแนบไปกับคำขอ (ไม่บังคับ)</label>
          <textarea className="tsm-textarea" rows="4"
            placeholder="แนะนำตัวเอง สอบถามรายละเอียด ฯลฯ"
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={loading} />
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            ข้อความนี้จะแสดงให้อีกฝ่ายเห็นเพื่อช่วยตัดสินใจ
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="tsm-btn tsm-btn-primary" onClick={handleSubmit} style={{ flex: 1 }} disabled={loading}>
            <Send size={16} /> ส่งคำขอ
          </button>
          <button className="tsm-btn tsm-btn-secondary" onClick={onClose} disabled={loading}>
            <X size={16} /> ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
