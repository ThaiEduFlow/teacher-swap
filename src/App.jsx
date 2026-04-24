import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, MapPin, User, BookOpen, MessageCircle, Plus, Check, Send,
  Filter, Sparkles, ArrowLeftRight, School, AlertCircle, LogIn, RefreshCw, Phone
} from 'lucide-react';
import { api, session } from './lib/api';
import { PROVINCES, SUBJECTS, LEVELS } from './lib/constants';
import AuthModal from './components/AuthModal';
import PostCard from './components/PostCard';
import ContactRequestModal from './components/ContactRequestModal';
import ContactRequestsView from './components/ContactRequestsView';
import './index.css';

const initials = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(session.getUser());
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [requests, setRequests] = useState([]); // contact requests
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('browse');
  const [showAuth, setShowAuth] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [toast, setToast] = useState(null);
  const [contactModalTarget, setContactModalTarget] = useState(null); // target post for contact request
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    fromProvince: '', toProvince: '', subject: '', level: '', search: ''
  });

  const [form, setForm] = useState({
    name: '', age: '', phone: '',
    fromProvince: '', fromDistrict: '', fromSchool: '',
    toProvince: '', toDistrict: '',
    subject: '', level: '', note: ''
  });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ===== Load data =====
  const loadPosts = useCallback(async (userId) => {
    // ส่ง userId ไปด้วยเพื่อให้ backend ตัดสินใจเปิด/ซ่อนเบอร์
    const res = await api.getPosts(userId || '');
    if (res.success) {
      setPosts((res.posts || []).sort((a, b) => Number(b.createdAt) - Number(a.createdAt)));
    }
  }, []);

  const loadMessages = useCallback(async (userId) => {
    if (!userId) return;
    const res = await api.getMessages(userId);
    if (res.success) {
      setMessages((res.messages || []).sort((a, b) => Number(a.createdAt) - Number(b.createdAt)));
    }
  }, []);

  const loadRequests = useCallback(async (userId) => {
    if (!userId) return;
    const res = await api.getMyRequests(userId);
    if (res.success) {
      setRequests(res.requests || []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPosts(currentUser?.id);
      if (currentUser) {
        await Promise.all([loadMessages(currentUser.id), loadRequests(currentUser.id)]);
      }
      setLoading(false);
    })();
  }, []);

  // Auto-refresh ทุก 30 วินาที
  useEffect(() => {
    const interval = setInterval(() => {
      loadPosts(currentUser?.id);
      if (currentUser) {
        loadMessages(currentUser.id);
        loadRequests(currentUser.id);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, loadPosts, loadMessages, loadRequests]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts(currentUser?.id);
    if (currentUser) {
      await Promise.all([loadMessages(currentUser.id), loadRequests(currentUser.id)]);
    }
    setRefreshing(false);
    showToast('อัพเดทข้อมูลล่าสุดแล้ว', 'success');
  };

  // ===== Auth =====
  const handleAuthSuccess = async (user) => {
    session.setUser(user);
    setCurrentUser(user);
    setShowAuth(false);
    await Promise.all([loadPosts(user.id), loadMessages(user.id), loadRequests(user.id)]);
  };

  const handleLogout = async () => {
    session.clear();
    setCurrentUser(null);
    setMessages([]);
    setRequests([]);
    setView('browse');
    await loadPosts(''); // reload with no user → เบอร์ซ่อนทั้งหมด
    showToast('ออกจากระบบแล้ว', 'info');
  };

  // ===== Posts =====
  const handleCreatePost = async () => {
    if (!currentUser) { setShowAuth(true); return; }
    const required = ['name', 'age', 'phone', 'fromProvince', 'fromDistrict', 'toProvince', 'subject', 'level'];
    for (const f of required) {
      if (!form[f]) { showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error'); return; }
    }
    const res = await api.createPost({
      ...form,
      age: parseInt(form.age),
      userId: currentUser.id,
      userName: currentUser.displayName,
    });
    if (res.success) {
      showToast('ลงประกาศสำเร็จ!', 'success');
      setForm({
        name: '', age: '', phone: '',
        fromProvince: '', fromDistrict: '', fromSchool: '',
        toProvince: '', toDistrict: '',
        subject: '', level: '', note: ''
      });
      await loadPosts(currentUser.id);
      setView('browse');
    } else {
      showToast(res.error || 'ลงประกาศไม่สำเร็จ', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('ลบประกาศนี้?')) return;
    const res = await api.deletePost(postId, currentUser.id);
    if (res.success) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('ลบประกาศแล้ว', 'success');
    } else {
      showToast(res.error || 'ลบไม่สำเร็จ', 'error');
    }
  };

  // ===== Contact Requests =====
  const handleRequestContact = (targetPost) => {
    setContactModalTarget(targetPost);
  };

  const submitContactRequest = async (messageText) => {
    if (!contactModalTarget || !currentUser) return;
    setContactSubmitting(true);
    const res = await api.requestContact({
      requesterId: currentUser.id,
      requesterName: currentUser.displayName,
      targetId: contactModalTarget.userId,
      targetName: contactModalTarget.userName || contactModalTarget.name,
      relatedPostId: contactModalTarget.id,
      requesterMessage: messageText,
    });
    setContactSubmitting(false);
    if (res.success) {
      showToast('ส่งคำขอแลกเบอร์แล้ว รออีกฝ่ายยืนยัน', 'success');
      setContactModalTarget(null);
      await loadRequests(currentUser.id);
    } else {
      showToast(res.error || 'ส่งคำขอไม่สำเร็จ', 'error');
    }
  };

  const handleRespondRequest = async (requestId, response) => {
    const res = await api.respondToRequest(requestId, currentUser.id, response);
    if (res.success) {
      showToast(
        response === 'accept' ? 'ยินยอมแลกเบอร์แล้ว! 🎉 เบอร์ถูกเปิดเผยให้ทั้งสองฝ่ายเห็น' : 'ปฏิเสธคำขอแล้ว',
        response === 'accept' ? 'success' : 'info'
      );
      // reload ทั้ง requests และ posts (เพื่อให้เบอร์ที่ถูก unlock แสดงผลใหม่)
      await Promise.all([loadRequests(currentUser.id), loadPosts(currentUser.id)]);
    } else {
      showToast(res.error || 'ดำเนินการไม่สำเร็จ', 'error');
    }
  };

  const handleCancelContact = async (requestId) => {
    const res = await api.cancelContact(requestId, currentUser.id);
    if (res.success) {
      showToast('ยกเลิกคำขอแล้ว', 'info');
      await Promise.all([loadRequests(currentUser.id), loadPosts(currentUser.id)]);
    } else {
      showToast(res.error || 'ยกเลิกไม่สำเร็จ', 'error');
    }
  };

  // ===== Matching =====
  const findMatchesFor = useCallback((post) => {
    return posts.filter(other => {
      if (other.id === post.id || other.userId === post.userId) return false;
      const provinceMatch = other.fromProvince === post.toProvince && other.toProvince === post.fromProvince;
      if (!provinceMatch) return false;
      const subjectMatch = other.subject === post.subject;
      const levelMatch = other.level === post.level;
      return subjectMatch && levelMatch;
    });
  }, [posts]);

  const myPosts = useMemo(() => {
    if (!currentUser) return [];
    return posts.filter(p => p.userId === currentUser.id);
  }, [posts, currentUser]);

  const myMatches = useMemo(() => {
    if (!currentUser) return [];
    const all = [];
    myPosts.forEach(myPost => {
      findMatchesFor(myPost).forEach(match => {
        all.push({ myPost, matchPost: match });
      });
    });
    return all;
  }, [myPosts, findMatchesFor]);

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (filters.fromProvince && p.fromProvince !== filters.fromProvince) return false;
      if (filters.toProvince && p.toProvince !== filters.toProvince) return false;
      if (filters.subject && p.subject !== filters.subject) return false;
      if (filters.level && p.level !== filters.level) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const text = `${p.name} ${p.fromProvince} ${p.fromDistrict} ${p.toProvince} ${p.toDistrict} ${p.subject} ${p.fromSchool || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [posts, filters]);

  // ===== Messages =====
  const handleSendMessage = async (toUserId, toUserName, content, relatedPostId) => {
    if (!currentUser || !content.trim()) return;
    const res = await api.sendMessage({
      fromUserId: currentUser.id,
      fromUserName: currentUser.displayName,
      toUserId, toUserName,
      content: content.trim(),
      relatedPostId: relatedPostId || ''
    });
    if (res.success) {
      setMessages(prev => [...prev, res.message]);
    } else {
      showToast(res.error || 'ส่งไม่สำเร็จ', 'error');
    }
  };

  const myConversations = useMemo(() => {
    if (!currentUser) return [];
    const map = new Map();
    messages.forEach(m => {
      if (m.fromUserId !== currentUser.id && m.toUserId !== currentUser.id) return;
      const otherId = m.fromUserId === currentUser.id ? m.toUserId : m.fromUserId;
      const otherName = m.fromUserId === currentUser.id ? m.toUserName : m.fromUserName;
      if (!map.has(otherId)) map.set(otherId, { otherId, otherName, messages: [], unread: 0 });
      const conv = map.get(otherId);
      conv.messages.push(m);
      if (m.toUserId === currentUser.id && !m.read) conv.unread++;
    });
    return Array.from(map.values()).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.createdAt || 0;
      const bLast = b.messages[b.messages.length - 1]?.createdAt || 0;
      return Number(bLast) - Number(aLast);
    });
  }, [messages, currentUser]);

  const totalUnread = myConversations.reduce((sum, c) => sum + c.unread, 0);

  // จำนวนคำขอแลกเบอร์ที่รอตอบ (received pending)
  const pendingRequestsCount = useMemo(() => {
    if (!currentUser) return 0;
    return requests.filter(r => r.targetId === currentUser.id && r.status === 'pending').length;
  }, [requests, currentUser]);

  if (loading) {
    return (
      <div className="tsm-app">
        <div className="tsm-spinner"></div>
        <p style={{ textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="tsm-app">
      {toast && <div className={`tsm-toast ${toast.type}`}>{toast.message}</div>}

      <header className="tsm-header">
        <div className="tsm-header-inner">
          <div className="tsm-logo">
            <div className="tsm-logo-icon"><ArrowLeftRight size={22} /></div>
            <div>
              <div>จับคู่ย้ายครู</div>
              <div className="tsm-logo-sub">ระบบจับคู่สลับตำแหน่งข้าราชการครูไทย</div>
            </div>
          </div>

          <nav className="tsm-nav">
            <button className={`tsm-nav-btn ${view==='browse'?'active':''}`} onClick={() => setView('browse')}>
              <Search size={16} /> ค้นหาคู่สลับ
            </button>
            {currentUser && (
              <>
                <button className={`tsm-nav-btn ${view==='create'?'active':''}`} onClick={() => setView('create')}>
                  <Plus size={16} /> ลงประกาศ
                </button>
                <button className={`tsm-nav-btn ${view==='matches'?'active':''}`} onClick={() => setView('matches')}>
                  <Sparkles size={16} /> คู่ที่แมทช์
                  {myMatches.length > 0 && <span className="tsm-badge">{myMatches.length}</span>}
                </button>
                <button className={`tsm-nav-btn ${view==='contacts'?'active':''}`} onClick={() => setView('contacts')}>
                  <Phone size={16} /> คำขอแลกเบอร์
                  {pendingRequestsCount > 0 && <span className="tsm-badge">{pendingRequestsCount}</span>}
                </button>
                <button className={`tsm-nav-btn ${view==='messages'?'active':''}`} onClick={() => setView('messages')}>
                  <MessageCircle size={16} /> ข้อความ
                  {totalUnread > 0 && <span className="tsm-badge">{totalUnread}</span>}
                </button>
              </>
            )}
            <button className="tsm-nav-btn" onClick={handleRefresh} disabled={refreshing} title="รีเฟรชข้อมูล">
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </nav>

          <div className="tsm-user-info">
            {currentUser ? (
              <>
                <div className="tsm-avatar">{initials(currentUser.displayName)}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{currentUser.displayName}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, cursor: 'pointer' }} onClick={handleLogout}>ออกจากระบบ</div>
                </div>
              </>
            ) : (
              <button className="tsm-btn" onClick={() => setShowAuth(true)} style={{ background: 'white', color: '#1e3a8a' }}>
                <LogIn size={16} /> เข้าสู่ระบบ
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="tsm-main">
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onSuccess={handleAuthSuccess}
            showToast={showToast}
          />
        )}

        {view === 'browse' && (
          <BrowseView
            posts={posts}
            filteredPosts={filteredPosts}
            myPosts={myPosts}
            myMatches={myMatches}
            currentUser={currentUser}
            requests={requests}
            filters={filters}
            setFilters={setFilters}
            findMatchesFor={findMatchesFor}
            onDeletePost={handleDeletePost}
            onRequestContact={handleRequestContact}
            onMessagePost={(post) => {
              setActiveChat({ userId: post.userId, userName: post.userName || post.name, postId: post.id });
              setView('messages');
            }}
            onLoginPrompt={() => setShowAuth(true)}
            onGoCreate={() => setView('create')}
          />
        )}

        {view === 'create' && currentUser && (
          <CreatePostView form={form} setForm={setForm} onSubmit={handleCreatePost} onCancel={() => setView('browse')} />
        )}

        {view === 'matches' && currentUser && (
          <MatchesView
            myMatches={myMatches}
            myPosts={myPosts}
            requests={requests}
            currentUser={currentUser}
            onRequestContact={handleRequestContact}
            onMessage={(post) => {
              setActiveChat({ userId: post.userId, userName: post.userName || post.name, postId: post.id });
              setView('messages');
            }}
            onGoCreate={() => setView('create')}
          />
        )}

        {view === 'contacts' && currentUser && (
          <ContactRequestsView
            requests={requests}
            posts={posts}
            currentUser={currentUser}
            onRespond={handleRespondRequest}
            onCancel={handleCancelContact}
          />
        )}

        {view === 'messages' && currentUser && (
          <MessagesView
            activeChat={activeChat}
            setActiveChat={setActiveChat}
            conversations={myConversations}
            messages={messages}
            currentUser={currentUser}
            onSend={handleSendMessage}
          />
        )}

        {contactModalTarget && (
          <ContactRequestModal
            targetPost={contactModalTarget}
            currentUser={currentUser}
            onSubmit={submitContactRequest}
            onClose={() => setContactModalTarget(null)}
            loading={contactSubmitting}
          />
        )}

        {!currentUser && view !== 'browse' && (
          <div className="tsm-login-prompt">
            <div className="tsm-empty-icon"><LogIn size={28} /></div>
            <h3 style={{ fontFamily: 'Prompt', color: '#475569' }}>กรุณาเข้าสู่ระบบก่อน</h3>
            <button className="tsm-btn tsm-btn-primary" onClick={() => setShowAuth(true)} style={{ marginTop: 16 }}>
              <LogIn size={16} /> เข้าสู่ระบบ
            </button>
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
        ระบบจับคู่ย้ายครู • สร้างเพื่ออำนวยความสะดวกให้ครูไทย
      </footer>
    </div>
  );
}

// ====================== Sub Views ======================

function BrowseView({ posts, filteredPosts, myPosts, myMatches, currentUser, requests, filters, setFilters, findMatchesFor, onDeletePost, onRequestContact, onMessagePost, onLoginPrompt, onGoCreate }) {
  return (
    <>
      <div className="tsm-info-banner">
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>ยินดีต้อนรับสู่ระบบจับคู่ย้ายครู</strong><br/>
          ระบบจะช่วยจับคู่ครูที่ต้องการสลับตำแหน่งกันโดยอัตโนมัติ — เมื่อมีครูอีกท่านต้องการย้ายในทิศทางตรงข้ามกับคุณ และสอนวิชาเอก/ระดับชั้นเดียวกัน จะขึ้นป้าย "แมทช์" ทันที
        </div>
      </div>

      <div className="tsm-stats">
        <div className="tsm-stat">
          <div className="tsm-stat-label">ประกาศทั้งหมด</div>
          <div className="tsm-stat-value">{posts.length}</div>
        </div>
        <div className="tsm-stat">
          <div className="tsm-stat-label">จังหวัดที่เกี่ยวข้อง</div>
          <div className="tsm-stat-value">{new Set(posts.flatMap(p => [p.fromProvince, p.toProvince])).size}</div>
        </div>
        <div className="tsm-stat">
          <div className="tsm-stat-label">ประกาศของคุณ</div>
          <div className="tsm-stat-value">{myPosts.length}</div>
        </div>
        <div className="tsm-stat">
          <div className="tsm-stat-label">คู่ที่แมทช์</div>
          <div className="tsm-stat-value" style={{ color: myMatches.length > 0 ? '#059669' : '#1e3a8a' }}>
            {myMatches.length}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="tsm-section-title">ประกาศขอย้าย/สลับตำแหน่ง</h2>
          <p className="tsm-section-sub">พบ {filteredPosts.length} ประกาศ</p>
        </div>
        {currentUser && (
          <button className="tsm-btn tsm-btn-primary" onClick={onGoCreate}>
            <Plus size={16} /> ลงประกาศ
          </button>
        )}
      </div>

      <div className="tsm-filters">
        <div>
          <label className="tsm-label">ค้นหา</label>
          <input className="tsm-input" placeholder="ชื่อ, โรงเรียน, อำเภอ..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <div>
          <label className="tsm-label">ต้นทาง</label>
          <select className="tsm-select" value={filters.fromProvince} onChange={e => setFilters({ ...filters, fromProvince: e.target.value })}>
            <option value="">ทุกจังหวัด</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="tsm-label">ปลายทาง</label>
          <select className="tsm-select" value={filters.toProvince} onChange={e => setFilters({ ...filters, toProvince: e.target.value })}>
            <option value="">ทุกจังหวัด</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="tsm-label">วิชาเอก</label>
          <select className="tsm-select" value={filters.subject} onChange={e => setFilters({ ...filters, subject: e.target.value })}>
            <option value="">ทุกวิชา</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="tsm-label">ระดับชั้น</label>
          <select className="tsm-select" value={filters.level} onChange={e => setFilters({ ...filters, level: e.target.value })}>
            <option value="">ทุกระดับ</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="tsm-empty">
          <div className="tsm-empty-icon"><Search size={28} /></div>
          <h3 style={{ color: '#475569', margin: '0 0 8px', fontFamily: 'Prompt' }}>ยังไม่มีประกาศ</h3>
          <p>{posts.length === 0 ? 'เป็นคนแรกที่ลงประกาศขอย้ายในระบบนี้!' : 'ลองปรับตัวกรองใหม่'}</p>
        </div>
      ) : (
        <div className="tsm-post-grid">
          {filteredPosts.map(post => {
            const matchesWithMe = currentUser ? findMatchesFor(post).filter(m => m.userId === currentUser.id) : [];
            return (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                isMatch={matchesWithMe.length > 0}
                requests={requests}
                onDelete={onDeletePost}
                onMessage={onMessagePost}
                onRequestContact={onRequestContact}
                onLoginPrompt={onLoginPrompt}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function CreatePostView({ form, setForm, onSubmit, onCancel }) {
  return (
    <>
      <h2 className="tsm-section-title">ลงประกาศขอย้าย/สลับตำแหน่ง</h2>
      <p className="tsm-section-sub">กรอกข้อมูลให้ครบถ้วน ระบบจะจับคู่อัตโนมัติกับครูที่ต้องการสลับกับคุณ</p>

      <div className="tsm-card">
        <div className="tsm-form">
          <div className="tsm-form-section">
            <h3 className="tsm-form-section-title"><User size={16} /> ข้อมูลส่วนตัว</h3>
          </div>
          <div>
            <label className="tsm-label tsm-label-required">ชื่อ-นามสกุล</label>
            <input className="tsm-input" placeholder="เช่น ครูสมใจ ใจดี"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="tsm-label tsm-label-required">อายุ</label>
            <input className="tsm-input" type="number" placeholder="35" min="20" max="65"
              value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
          </div>
          <div className="tsm-form-full">
            <label className="tsm-label tsm-label-required">เบอร์โทร/Line ID (สำหรับติดต่อ)</label>
            <input className="tsm-input" placeholder="081-234-5678 หรือ LINE ID"
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="tsm-form-section">
            <h3 className="tsm-form-section-title"><MapPin size={16} /> ตำแหน่งปัจจุบัน (ต้นทาง)</h3>
          </div>
          <div>
            <label className="tsm-label tsm-label-required">จังหวัดต้นทาง</label>
            <select className="tsm-select" value={form.fromProvince} onChange={e => setForm({ ...form, fromProvince: e.target.value })}>
              <option value="">เลือกจังหวัด</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="tsm-label tsm-label-required">อำเภอต้นทาง</label>
            <input className="tsm-input" placeholder="เช่น เมือง, ปากช่อง"
              value={form.fromDistrict} onChange={e => setForm({ ...form, fromDistrict: e.target.value })} />
          </div>
          <div className="tsm-form-full">
            <label className="tsm-label">โรงเรียนต้นทาง (ไม่บังคับ)</label>
            <input className="tsm-input" placeholder="เช่น โรงเรียนบ้านนา"
              value={form.fromSchool} onChange={e => setForm({ ...form, fromSchool: e.target.value })} />
          </div>

          <div className="tsm-form-section">
            <h3 className="tsm-form-section-title"><School size={16} /> ปลายทางที่ต้องการย้ายไป</h3>
          </div>
          <div>
            <label className="tsm-label tsm-label-required">จังหวัดปลายทาง</label>
            <select className="tsm-select" value={form.toProvince} onChange={e => setForm({ ...form, toProvince: e.target.value })}>
              <option value="">เลือกจังหวัด</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="tsm-label">อำเภอปลายทาง (ไม่บังคับ)</label>
            <input className="tsm-input" placeholder="ไม่ระบุ = ยินดีทุกอำเภอ"
              value={form.toDistrict} onChange={e => setForm({ ...form, toDistrict: e.target.value })} />
          </div>

          <div className="tsm-form-section">
            <h3 className="tsm-form-section-title"><BookOpen size={16} /> วิชาเอก/ระดับชั้นที่สอน</h3>
          </div>
          <div>
            <label className="tsm-label tsm-label-required">วิชาเอก</label>
            <select className="tsm-select" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
              <option value="">เลือกวิชาเอก</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="tsm-label tsm-label-required">ระดับชั้นที่สอน</label>
            <select className="tsm-select" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
              <option value="">เลือกระดับชั้น</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="tsm-form-full">
            <label className="tsm-label">หมายเหตุเพิ่มเติม (ไม่บังคับ)</label>
            <textarea className="tsm-textarea" rows="3" placeholder="เช่น สาเหตุการย้าย ความต้องการพิเศษ"
              value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>

          <div className="tsm-form-full" style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="tsm-btn tsm-btn-primary" onClick={onSubmit} style={{ padding: '12px 24px', fontSize: 15 }}>
              <Check size={16} /> บันทึกประกาศ
            </button>
            <button className="tsm-btn tsm-btn-secondary" onClick={onCancel}>ยกเลิก</button>
          </div>
        </div>
      </div>
    </>
  );
}

function MatchesView({ myMatches, myPosts, requests, currentUser, onRequestContact, onMessage, onGoCreate }) {
  // เช็ค contact status สำหรับ match แต่ละคู่
  const getStatus = (matchPost) => {
    const cr = requests.find(r => {
      const samePair = (r.requesterId === currentUser.id && r.targetId === matchPost.userId) ||
                       (r.requesterId === matchPost.userId && r.targetId === currentUser.id);
      const isActive = r.status === 'pending' || r.status === 'accepted';
      return samePair && isActive;
    });
    if (!cr) return 'none';
    if (cr.status === 'accepted') return 'accepted';
    return cr.requesterId === currentUser.id ? 'pending_sent' : 'pending_received';
  };

  return (
    <>
      <h2 className="tsm-section-title">คู่ที่แมทช์กับประกาศของคุณ</h2>
      <p className="tsm-section-sub">ครูที่ต้องการย้ายในทิศทางตรงข้าม + วิชาและระดับชั้นเดียวกัน</p>

      {myMatches.length === 0 ? (
        <div className="tsm-empty">
          <div className="tsm-empty-icon"><Sparkles size={28} /></div>
          <h3 style={{ color: '#475569', margin: '0 0 8px', fontFamily: 'Prompt' }}>ยังไม่มีคู่ที่แมทช์</h3>
          <p style={{ maxWidth: 420, margin: '0 auto' }}>
            {myPosts.length === 0
              ? 'คุณยังไม่ได้ลงประกาศ เริ่มลงประกาศเพื่อให้ระบบจับคู่ให้อัตโนมัติ'
              : 'ยังไม่มีครูที่ต้องการสลับกับคุณในตอนนี้'}
          </p>
          {myPosts.length === 0 && (
            <button className="tsm-btn tsm-btn-primary" style={{ marginTop: 16 }} onClick={onGoCreate}>
              <Plus size={16} /> ลงประกาศ
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {myMatches.map((m, idx) => {
            const status = getStatus(m.matchPost);
            return (
              <div key={idx} className="tsm-card" style={{ borderColor: '#059669', borderWidth: 2 }}>
                <div className="tsm-match-notif">
                  <Sparkles size={20} />
                  <div><strong>พบคู่สลับที่ตรงกัน!</strong> — ทั้งสองฝ่ายต้องการย้ายในทิศทางสลับ และสอนวิชา/ระดับเดียวกัน</div>
                </div>
                <div className="tsm-match-comparison">
                  <div className="tsm-card" style={{ background: '#f0f9ff', borderColor: '#bfdbfe' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: 8 }}>ประกาศของคุณ</div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{m.myPost.name}</div>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                      📍 {m.myPost.fromProvince} ({m.myPost.fromDistrict})<br/>
                      ➡️ {m.myPost.toProvince}{m.myPost.toDistrict && ` (${m.myPost.toDistrict})`}<br/>
                      📚 {m.myPost.subject} • {m.myPost.level}
                    </div>
                  </div>
                  <div className="tsm-match-arrow"><ArrowLeftRight size={28} /></div>
                  <div className="tsm-card" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase', marginBottom: 8 }}>คู่ที่แมทช์</div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{m.matchPost.name} ({m.matchPost.age} ปี)</div>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                      📍 {m.matchPost.fromProvince} ({m.matchPost.fromDistrict})<br/>
                      ➡️ {m.matchPost.toProvince}{m.matchPost.toDistrict && ` (${m.matchPost.toDistrict})`}<br/>
                      📚 {m.matchPost.subject} • {m.matchPost.level}
                    </div>
                    {m.matchPost.note && <div className="tsm-note" style={{ marginTop: 10, borderColor: '#86efac' }}>{m.matchPost.note}</div>}
                    {/* แสดงเบอร์ถ้าได้รับการยินยอมแล้ว */}
                    {m.matchPost.phoneRevealed && (
                      <div style={{ marginTop: 10, padding: 10, background: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#059669', border: '1px solid #86efac' }}>
                        📞 {m.matchPost.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  {status === 'accepted' && (
                    <button className="tsm-btn tsm-btn-success" style={{ flex: 1 }} onClick={() => onMessage(m.matchPost)}>
                      <MessageCircle size={16} /> ส่งข้อความ
                    </button>
                  )}
                  {status === 'pending_sent' && (
                    <button className="tsm-btn tsm-btn-secondary" disabled style={{ flex: 1 }}>
                      ⏳ รออีกฝ่ายยืนยัน...
                    </button>
                  )}
                  {status === 'pending_received' && (
                    <div style={{ flex: 1, padding: '10px 14px', background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: 13, textAlign: 'center', fontWeight: 500 }}>
                      ⚠️ อีกฝ่ายขอแลกเบอร์กับคุณ — ไปที่แท็บ "คำขอแลกเบอร์"
                    </div>
                  )}
                  {status === 'none' && (
                    <button className="tsm-btn tsm-btn-primary" style={{ flex: 1 }} onClick={() => onRequestContact(m.matchPost)}>
                      <Phone size={16} /> ขอแลกเบอร์ติดต่อ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function MessagesView({ activeChat, setActiveChat, conversations, messages, currentUser, onSend }) {
  const [text, setText] = useState('');

  const chatMessages = useMemo(() => {
    if (!activeChat) return [];
    return messages.filter(m =>
      (m.fromUserId === currentUser.id && m.toUserId === activeChat.userId) ||
      (m.fromUserId === activeChat.userId && m.toUserId === currentUser.id)
    ).sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
  }, [messages, activeChat, currentUser]);

  const handleSend = () => {
    if (!text.trim() || !activeChat) return;
    onSend(activeChat.userId, activeChat.userName, text, activeChat.postId);
    setText('');
  };

  return (
    <>
      <h2 className="tsm-section-title">ข้อความ</h2>
      <p className="tsm-section-sub">ติดต่อสื่อสารกับครูท่านอื่น</p>

      <div className="tsm-chat-layout">
        <div className="tsm-conv-list">
          {conversations.length === 0 && !activeChat ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
              <MessageCircle size={32} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13 }}>ยังไม่มีข้อความ</p>
            </div>
          ) : (
            <>
              {activeChat && !conversations.find(c => c.otherId === activeChat.userId) && (
                <div className="tsm-conv-item active">
                  <div className="tsm-conv-name">{activeChat.userName}</div>
                  <div className="tsm-conv-preview">เริ่มการสนทนาใหม่</div>
                </div>
              )}
              {conversations.map(c => (
                <div key={c.otherId}
                  className={`tsm-conv-item ${activeChat?.userId === c.otherId ? 'active' : ''}`}
                  onClick={() => setActiveChat({ userId: c.otherId, userName: c.otherName })}>
                  <div className="tsm-conv-name">
                    {c.otherName}
                    {c.unread > 0 && <span className="tsm-badge">{c.unread}</span>}
                  </div>
                  <div className="tsm-conv-preview">{c.messages[c.messages.length - 1]?.content}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="tsm-chat-window">
          {!activeChat ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: 40, textAlign: 'center' }}>
              <div>
                <MessageCircle size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
                <p>เลือกการสนทนาจากด้านซ้าย<br/>หรือเริ่มการสนทนาจากประกาศ</p>
              </div>
            </div>
          ) : (
            <>
              <div className="tsm-chat-header">💬 คุยกับ {activeChat.userName}</div>
              <div className="tsm-chat-messages">
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 13 }}>เริ่มการสนทนาได้เลย</div>
                ) : (
                  chatMessages.map(m => (
                    <div key={m.id} className={`tsm-msg ${m.fromUserId === currentUser.id ? 'tsm-msg-mine' : 'tsm-msg-theirs'}`}>
                      <div>{m.content}</div>
                      <div className="tsm-msg-time">
                        {new Date(Number(m.createdAt)).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="tsm-chat-input">
                <input className="tsm-input" placeholder="พิมพ์ข้อความ..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <button className="tsm-btn tsm-btn-primary" onClick={handleSend}>
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
