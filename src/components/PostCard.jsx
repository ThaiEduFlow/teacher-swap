import React from 'react';
import { ArrowLeftRight, Sparkles, Trash2, MessageCircle, LogIn, Phone, PhoneCall, Clock, XCircle } from 'lucide-react';

const initials = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
};

const formatTime = (ts) => {
  const d = new Date(Number(ts));
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'เมื่อสักครู่';
  if (diff < 3600000) return `${Math.floor(diff/60000)} นาทีที่แล้ว`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)} ชั่วโมงที่แล้ว`;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

/**
 * หา contact request status ระหว่าง currentUser กับเจ้าของโพสต์
 * @returns 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected'
 */
function getContactStatus(post, currentUser, requests) {
  if (!currentUser || !requests || post.userId === currentUser.id) return 'none';
  
  const cr = requests.find(r => {
    const samePair = (r.requesterId === currentUser.id && r.targetId === post.userId) ||
                     (r.requesterId === post.userId && r.targetId === currentUser.id);
    const isActive = r.status === 'pending' || r.status === 'accepted';
    return samePair && isActive;
  });
  
  if (!cr) {
    const rejected = requests.find(r => {
      const samePair = (r.requesterId === currentUser.id && r.targetId === post.userId) ||
                       (r.requesterId === post.userId && r.targetId === currentUser.id);
      return samePair && r.status === 'rejected';
    });
    return rejected ? 'rejected' : 'none';
  }
  
  if (cr.status === 'accepted') return 'accepted';
  if (cr.requesterId === currentUser.id) return 'pending_sent';
  return 'pending_received';
}

export default function PostCard({ post, currentUser, isMatch, requests, onDelete, onMessage, onRequestContact, onLoginPrompt }) {
  const isMyPost = currentUser && post.userId === currentUser.id;
  const contactStatus = getContactStatus(post, currentUser, requests);
  
  const phoneDisplay = () => {
    if (isMyPost) {
      return (
        <span style={{ color: '#1e3a8a', fontWeight: 600 }}>
          <PhoneCall size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
          {post.phone} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>(ของคุณ)</span>
        </span>
      );
    }
    if (post.phoneRevealed) {
      return (
        <span style={{ color: '#059669', fontWeight: 600 }}>
          <PhoneCall size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
          {post.phone}
          <span style={{ fontSize: 11, color: '#059669', fontWeight: 500, marginLeft: 6 }}>✓ เปิดเผยแล้ว</span>
        </span>
      );
    }
    return (
      <span style={{ color: '#94a3b8' }}>
        <Phone size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
        {post.phone || '***'}
        <span style={{ fontSize: 11, marginLeft: 6 }}>🔒 ซ่อนจนกว่าจะยินยอม</span>
      </span>
    );
  };

  const contactButton = () => {
    if (isMyPost) {
      return (
        <button className="tsm-btn tsm-btn-danger" onClick={() => onDelete(post.id)} style={{ flex: 1 }}>
          <Trash2 size={14} /> ลบประกาศ
        </button>
      );
    }
    if (!currentUser) {
      return (
        <button className="tsm-btn tsm-btn-secondary" style={{ flex: 1 }} onClick={onLoginPrompt}>
          <LogIn size={14} /> เข้าสู่ระบบเพื่อติดต่อ
        </button>
      );
    }
    
    switch (contactStatus) {
      case 'accepted':
        return (
          <button className="tsm-btn tsm-btn-success" onClick={() => onMessage(post)} style={{ flex: 1 }}>
            <MessageCircle size={14} /> ส่งข้อความ
          </button>
        );
      case 'pending_sent':
        return (
          <button className="tsm-btn tsm-btn-secondary" disabled style={{ flex: 1 }}>
            <Clock size={14} /> รออีกฝ่ายยืนยัน...
          </button>
        );
      case 'pending_received':
        return (
          <div style={{ flex: 1, padding: '8px 12px', background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: 12, textAlign: 'center', fontWeight: 500 }}>
            ⚠️ อีกฝ่ายขอแลกเบอร์ — ดูในแท็บ "คำขอแลกเบอร์"
          </div>
        );
      case 'rejected':
        return (
          <button className="tsm-btn tsm-btn-secondary" disabled style={{ flex: 1 }}>
            <XCircle size={14} /> คำขอถูกปฏิเสธ
          </button>
        );
      default:
        return (
          <button className="tsm-btn tsm-btn-primary" onClick={() => onRequestContact(post)} style={{ flex: 1 }}>
            <Phone size={14} /> ขอแลกเบอร์ติดต่อ
          </button>
        );
    }
  };

  return (
    <div className={`tsm-post-card ${isMatch ? 'match' : ''}`}>
      <div className="tsm-post-header">
        <div className="tsm-user">
          <div className="tsm-avatar" style={{ background: isMyPost ? '#1e3a8a' : undefined }}>
            {initials(post.userName || post.name)}
          </div>
          <div>
            <div className="tsm-user-name">{post.name}</div>
            <div className="tsm-user-meta">{post.age} ปี • {formatTime(post.createdAt)}</div>
          </div>
        </div>
        {isMatch && (
          <div className="tsm-match-badge">
            <Sparkles size={11} /> แมทช์กับคุณ
          </div>
        )}
        {isMyPost && (
          <div style={{ fontSize: 11, background: '#eff6ff', color: '#1e40af', padding: '4px 8px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>
            ของคุณ
          </div>
        )}
      </div>

      <div className="tsm-swap-flow">
        <div className="tsm-location">
          <div className="tsm-location-label">ต้นทาง</div>
          <div className="tsm-location-province">{post.fromProvince}</div>
          <div className="tsm-location-district">
            {post.fromDistrict}
            {post.fromSchool && <><br/><span style={{ fontSize: 11 }}>🏫 {post.fromSchool}</span></>}
          </div>
        </div>
        <div className="tsm-arrow"><ArrowLeftRight size={16} /></div>
        <div className="tsm-location">
          <div className="tsm-location-label">ปลายทางที่อยากไป</div>
          <div className="tsm-location-province">{post.toProvince}</div>
          <div className="tsm-location-district">{post.toDistrict || 'ไม่ระบุอำเภอ'}</div>
        </div>
      </div>

      <div className="tsm-tags">
        <span className="tsm-tag tsm-tag-subject">📚 {post.subject}</span>
        <span className="tsm-tag tsm-tag-level">{post.level}</span>
        <span className="tsm-tag tsm-tag-age">อายุ {post.age} ปี</span>
      </div>

      <div style={{ marginTop: 12, padding: '10px 12px', background: (post.phoneRevealed || isMyPost) ? '#f0fdf4' : '#f8fafc', borderRadius: 8, fontSize: 13, border: '1px solid', borderColor: (post.phoneRevealed || isMyPost) ? '#bbf7d0' : '#e2e8f0' }}>
        {phoneDisplay()}
      </div>

      {post.note && <div className="tsm-note">{post.note}</div>}

      <div className="tsm-post-actions">
        {contactButton()}
      </div>
    </div>
  );
}
