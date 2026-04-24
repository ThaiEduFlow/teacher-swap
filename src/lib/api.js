// src/lib/api.js
// API client สำหรับเรียก Google Apps Script backend

// ⚠️ สำคัญ: แก้ URL นี้เป็น URL ที่ได้จาก Google Apps Script deployment ของคุณ
// (หลังจาก Deploy แล้วจะได้ URL หน้าตาประมาณนี้: https://script.google.com/macros/s/AKfycby.../exec)
const API_URL = import.meta.env.VITE_API_URL || 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

async function callAPI(action, data = {}, method = 'POST') {
  try {
    if (method === 'GET') {
      const params = new URLSearchParams({ action, ...data });
      const response = await fetch(`${API_URL}?${params}`);
      return await response.json();
    } else {
      // ใช้ text/plain เพื่อเลี่ยง CORS preflight
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...data }),
      });
      return await response.json();
    }
  } catch (err) {
    console.error('API error:', err);
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
  }
}

// ========== Users ==========
export const api = {
  register: (data) => callAPI('register', data),
  login: (data) => callAPI('login', data),
  
  // ========== Posts ==========
  // ส่ง userId ไปด้วยเพื่อให้ backend รู้ว่าควรเปิด/ซ่อนเบอร์ของใคร
  getPosts: (userId = '') => callAPI('getPosts', { userId }, 'GET'),
  createPost: (data) => callAPI('createPost', data),
  deletePost: (postId, userId) => callAPI('deletePost', { postId, userId }),
  
  // ========== Messages ==========
  getMessages: (userId) => callAPI('getMessages', { userId }, 'GET'),
  sendMessage: (data) => callAPI('sendMessage', data),
  markAsRead: (userId, fromUserId) => callAPI('markAsRead', { userId, fromUserId }),
  
  // ========== Contact Requests (ระบบยินยอมแลกเบอร์) ==========
  requestContact: (data) => callAPI('requestContact', data),
  respondToRequest: (requestId, userId, response) => 
    callAPI('respondToRequest', { requestId, userId, response }),
  getMyRequests: (userId) => callAPI('getMyRequests', { userId }, 'GET'),
  cancelContact: (requestId, userId) => callAPI('cancelContact', { requestId, userId }),
};

// ========== Local Storage helpers (สำหรับเก็บ session ของ user ใน browser) ==========
export const session = {
  getUser: () => {
    try {
      const u = localStorage.getItem('teacher_swap_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    localStorage.setItem('teacher_swap_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('teacher_swap_user');
  },
};
