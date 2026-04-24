import React, { useMemo, useState } from 'react';
import { Phone, PhoneCall, Clock, Check, X, XCircle, Inbox, Send, CheckCircle2, Ban } from 'lucide-react';

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(Number(ts));
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'เมื่อสักครู่';
  if (diff < 3600000) return `${Math.floor(diff/60000)} นาทีที่แล้ว`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)} ชั่วโมงที่แล้ว`;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

const initials = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
};

export default function ContactRequestsView({ requests, posts, currentUser, onRespond, onCancel }) {
  const [tab, setTab] = useState('received'); // received, sent, accepted

  // แยกคำขอเป็น 3 กลุ่ม
  const { received, sent, accepted } = useMemo(() => {
    const received = requests.filter(r => r.targetId === currentUser.id && r.status === 'pending');
    const sent = requests.filter(r => r.requesterId === currentUser.id && r.status === 'pending');
    const accepted = requests.filter(r => 
      (r.targetId === currentUser.id || r.requesterId === currentUser.id) && r.status === 'accepted'
    );
    return { received, sent, accepted };
  }, [requests, currentUser]);

  // หาโพสต์ที่เกี่ยวข้อง
  const getRelatedPost = (postId) => posts.find(p => p.id === postId);
  
  // หาเบอร์จริงจากโพสต์ที่ยินยอมแล้ว — ต้องดึงจากโพสต์ที่ backend ส่งมา (ซึ่งจะเปิดเผยเบอร์ให้หลัง accepted)
  // เนื่องจาก backend ซ่อนเบอร์ตาม viewerId อยู่แล้ว โพสต์ใน posts จะมี phone จริงถ้าได้รับอนุญาต
  const getPhoneByUserId = (userId) => {
    const post = posts.find(p => p.userId === userId);
    if (post && post.phoneRevealed) return post.phone;
    return null;
  };

  return (
    <>
      <h2 className="tsm-section-title">คำขอแลกเบอร์ติดต่อ</h2>
      <p className="tsm-section-sub">จัดการคำขอและดูเบอร์ของครูที่ยินยอมแลกเบอร์กับคุณแล้ว</p>

      <div className="tsm-tabs">
        <button className={`tsm-tab ${tab==='received'?'active':''}`} onClick={() => setTab('received')}>
          <Inbox size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          คำขอที่ได้รับ
          {received.length > 0 && <span className="tsm-badge" style={{ marginLeft: 6 }}>{received.length}</span>}
        </button>
        <button className={`tsm-tab ${tab==='sent'?'active':''}`} onClick={() => setTab('sent')}>
          <Send size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          คำขอที่ส่ง
          {sent.length > 0 && <span className="tsm-badge" style={{ marginLeft: 6, background: '#64748b' }}>{sent.length}</span>}
        </button>
        <button className={`tsm-tab ${tab==='accepted'?'active':''}`} onClick={() => setTab('accepted')}>
          <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          ยินยอมแลกแล้ว
          {accepted.length > 0 && <span className="tsm-badge" style={{ marginLeft: 6, background: '#059669' }}>{accepted.length}</span>}
        </button>
      </div>

      {/* ============ คำขอที่ได้รับ ============ */}
      {tab === 'received' && (
        received.length === 0 ? (
          <div className="tsm-empty">
            <div className="tsm-empty-icon"><Inbox size={28} /></div>
            <h3 style={{ color: '#475569', margin: '0 0 8px', fontFamily: 'Prompt' }}>ยังไม่มีคำขอ</h3>
            <p>เมื่อมีครูสนใจแลกเบอร์กับคุณ คำขอจะแสดงที่นี่</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {received.map(r => {
              const relatedPost = getRelatedPost(r.relatedPostId);
              return (
                <div key={r.id} className="tsm-card" style={{ borderColor: '#fbbf24', borderWidth: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                    <div className="tsm-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
                      {initials(r.requesterName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{r.requesterName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        ส่งคำขอเมื่อ {formatTime(r.createdAt)}
                      </div>
                      {relatedPost && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          📍 {relatedPost.fromProvince} → {relatedPost.toProvince} • 📚 {relatedPost.subject} • {relatedPost.level}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                      รอตอบรับ
                    </div>
                  </div>

                  {r.requesterMessage && (
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569', marginBottom: 14, borderLeft: '3px solid #cbd5e1' }}>
                      💬 "{r.requesterMessage}"
                    </div>
                  )}

                  <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af', marginBottom: 14 }}>
                    ⚠️ <strong>ถ้าคุณยินยอม:</strong> เบอร์โทรของคุณและของ{r.requesterName}จะถูกเปิดเผยให้กันและกันเห็น คุณจะสามารถส่งข้อความติดต่อกันได้ผ่านแอปด้วย
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="tsm-btn tsm-btn-success" onClick={() => onRespond(r.id, 'accept')} style={{ flex: 1 }}>
                      <Check size={16} /> ยินยอมแลกเบอร์
                    </button>
                    <button className="tsm-btn tsm-btn-danger" onClick={() => onRespond(r.id, 'reject')} style={{ flex: 1 }}>
                      <X size={16} /> ปฏิเสธ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ============ คำขอที่ส่ง ============ */}
      {tab === 'sent' && (
        sent.length === 0 ? (
          <div className="tsm-empty">
            <div className="tsm-empty-icon"><Send size={28} /></div>
            <h3 style={{ color: '#475569', margin: '0 0 8px', fontFamily: 'Prompt' }}>ยังไม่มีคำขอที่ส่ง</h3>
            <p>เมื่อคุณขอแลกเบอร์กับครูท่านอื่น คำขอจะแสดงที่นี่</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {sent.map(r => {
              const relatedPost = getRelatedPost(r.relatedPostId);
              return (
                <div key={r.id} className="tsm-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div className="tsm-avatar" style={{ width: 48, height: 48, fontSize: 16, background: '#94a3b8' }}>
                      {initials(r.targetName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{r.targetName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        ส่งคำขอเมื่อ {formatTime(r.createdAt)}
                      </div>
                      {relatedPost && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          📍 {relatedPost.fromProvince} → {relatedPost.toProvince} • 📚 {relatedPost.subject}
                        </div>
                      )}
                      {r.requesterMessage && (
                        <div style={{ fontSize: 13, color: '#475569', marginTop: 8, padding: 10, background: '#f8fafc', borderRadius: 6 }}>
                          💬 "{r.requesterMessage}"
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <Clock size={10} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />
                      รอตอบรับ
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                    <button className="tsm-btn tsm-btn-secondary" onClick={() => onCancel(r.id)}>
                      <Ban size={14} /> ยกเลิกคำขอ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ============ ยินยอมแลกแล้ว ============ */}
      {tab === 'accepted' && (
        accepted.length === 0 ? (
          <div className="tsm-empty">
            <div className="tsm-empty-icon"><CheckCircle2 size={28} /></div>
            <h3 style={{ color: '#475569', margin: '0 0 8px', fontFamily: 'Prompt' }}>ยังไม่มีการแลกเบอร์</h3>
            <p>เมื่อคุณและครูท่านอื่นยินยอมแลกเบอร์กัน จะแสดงที่นี่</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {accepted.map(r => {
              const otherId = r.requesterId === currentUser.id ? r.targetId : r.requesterId;
              const otherName = r.requesterId === currentUser.id ? r.targetName : r.requesterName;
              const phone = getPhoneByUserId(otherId);
              const relatedPost = getRelatedPost(r.relatedPostId);

              return (
                <div key={r.id} className="tsm-card" style={{ borderColor: '#059669', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                    <div className="tsm-avatar" style={{ width: 48, height: 48, fontSize: 16, background: '#059669' }}>
                      {initials(otherName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{otherName}</div>
                      <div style={{ fontSize: 12, color: '#059669', marginTop: 2, fontWeight: 500 }}>
                        ✓ ยินยอมแลกเบอร์กันเมื่อ {formatTime(r.respondedAt)}
                      </div>
                      {relatedPost && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          📍 {relatedPost.fromProvince} → {relatedPost.toProvince} • 📚 {relatedPost.subject}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: 14, background: 'white', borderRadius: 8, border: '1px solid #86efac', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      เบอร์ติดต่อ
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PhoneCall size={18} />
                      {phone || (
                        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}>
                          ไม่สามารถดึงเบอร์ได้ (โพสต์อาจถูกลบแล้ว)
                        </span>
                      )}
                    </div>
                    {phone && (
                      <a href={`tel:${phone}`} style={{ display: 'inline-block', marginTop: 8, padding: '6px 12px', background: '#059669', color: 'white', borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                        📞 โทรเลย
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="tsm-btn tsm-btn-secondary" onClick={() => {
                      if (confirm('ยกเลิกการยินยอมแลกเบอร์? เบอร์โทรของทั้งสองฝ่ายจะถูกซ่อนอีกครั้ง')) {
                        onCancel(r.id);
                      }
                    }}>
                      <Ban size={14} /> ยกเลิกการยินยอม
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </>
  );
}
