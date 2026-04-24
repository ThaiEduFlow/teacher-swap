import React, { useState } from 'react';
import { Check, LogIn, UserPlus } from 'lucide-react';
import { api } from '../lib/api';

export default function AuthModal({ onClose, onSuccess, showToast }) {
  const [mode, setMode] = useState('login'); // 'login' หรือ 'register'
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    displayName: '',
    phone: '',
    email: '',
  });

  const handleSubmit = async () => {
    if (mode === 'login') {
      if (!form.username.trim() || !form.password) {
        showToast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
        return;
      }
      setLoading(true);
      const res = await api.login({ username: form.username, password: form.password });
      setLoading(false);
      if (res.success) {
        showToast('เข้าสู่ระบบสำเร็จ', 'success');
        onSuccess(res.user);
      } else {
        showToast(res.error || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
      }
    } else {
      if (!form.username.trim() || !form.password || !form.displayName.trim()) {
        showToast('กรุณากรอกข้อมูลให้ครบ', 'error');
        return;
      }
      if (form.password.length < 6) {
        showToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
        return;
      }
      setLoading(true);
      const res = await api.register(form);
      setLoading(false);
      if (res.success) {
        showToast('สมัครสมาชิกสำเร็จ', 'success');
        onSuccess(res.user);
      } else {
        showToast(res.error || 'สมัครสมาชิกไม่สำเร็จ', 'error');
      }
    }
  };

  return (
    <div className="tsm-modal-overlay" onClick={onClose}>
      <div className="tsm-modal" onClick={e => e.stopPropagation()}>
        <div className="tsm-tabs">
          <button className={`tsm-tab ${mode==='login'?'active':''}`} onClick={() => setMode('login')}>
            เข้าสู่ระบบ
          </button>
          <button className={`tsm-tab ${mode==='register'?'active':''}`} onClick={() => setMode('register')}>
            สมัครสมาชิก
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="tsm-label tsm-label-required">ชื่อผู้ใช้ (Username)</label>
            <input className="tsm-input" placeholder="เช่น teacher_som"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              disabled={loading} />
          </div>

          <div>
            <label className="tsm-label tsm-label-required">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
            <input className="tsm-input" type="password" placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              disabled={loading} />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="tsm-label tsm-label-required">ชื่อที่แสดง</label>
                <input className="tsm-input" placeholder="เช่น ครูสมใจ ใจดี"
                  value={form.displayName}
                  onChange={e => setForm({ ...form, displayName: e.target.value })}
                  disabled={loading} />
              </div>

              <div>
                <label className="tsm-label">เบอร์โทร (ไม่บังคับ)</label>
                <input className="tsm-input" placeholder="081-234-5678"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  disabled={loading} />
              </div>

              <div>
                <label className="tsm-label">อีเมล (ไม่บังคับ)</label>
                <input className="tsm-input" type="email" placeholder="email@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  disabled={loading} />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="tsm-btn tsm-btn-primary" onClick={handleSubmit} style={{ flex: 1 }} disabled={loading}>
              {mode === 'login' ? <><LogIn size={16} /> เข้าสู่ระบบ</> : <><UserPlus size={16} /> สมัครสมาชิก</>}
            </button>
            <button className="tsm-btn tsm-btn-secondary" onClick={onClose} disabled={loading}>
              ยกเลิก
            </button>
          </div>
        </div>

        {loading && <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 12 }}>
          กำลังดำเนินการ...
        </p>}
      </div>
    </div>
  );
}
