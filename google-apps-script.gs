/**
 * Google Apps Script v2 - Backend สำหรับระบบจับคู่ย้ายครู
 * เวอร์ชันนี้: เพิ่มระบบยินยอมแลกเบอร์ติดต่อ (Contact Consent)
 * 
 * วิธีใช้:
 * 1. เปิด Google Sheets ที่ใช้เป็นฐานข้อมูล
 * 2. Extensions → Apps Script → ลบ code เดิม → วาง code นี้ → บันทึก
 * 3. รันฟังก์ชัน setupSheets ครั้งเดียว (จะสร้าง sheet ใหม่ ContactRequests)
 * 4. Deploy → Manage deployments → Edit → New version → Deploy
 *    (URL เดิมจะยังใช้ได้ แต่ทำงานเป็นเวอร์ชันใหม่)
 * 
 * โครงสร้าง Sheet:
 * - Posts: id, userId, userName, name, age, phone, fromProvince, fromDistrict,
 *          fromSchool, toProvince, toDistrict, subject, level, note, createdAt, status
 * - Messages: id, fromUserId, fromUserName, toUserId, toUserName, content,
 *             relatedPostId, createdAt, read
 * - Users: id, displayName, phone, email, passwordHash, createdAt
 * - ContactRequests (ใหม่): id, requesterId, requesterName, targetId, targetName,
 *                            relatedPostId, status, requesterMessage, createdAt, respondedAt
 *   (status = 'pending' | 'accepted' | 'rejected' | 'cancelled')
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ======================================================================
// Router
// ======================================================================

function doGet(e) { return handleRequest(e, 'GET'); }
function doPost(e) { return handleRequest(e, 'POST'); }

function handleRequest(e, method) {
  try {
    let params = e.parameter || {};
    let body = {};
    
    if (method === 'POST' && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
    }
    
    const action = params.action || body.action;
    let result;
    
    switch (action) {
      case 'register': result = registerUser(body); break;
      case 'login': result = loginUser(body); break;
      
      // getPosts ต้องรู้ว่าเป็น user ไหนเพื่อตัดสินใจเปิด/ซ่อนเบอร์
      case 'getPosts': result = getPosts(params.userId || body.userId); break;
      case 'createPost': result = createPost(body); break;
      case 'deletePost': result = deletePost(body); break;
      
      case 'getMessages': result = getMessages(params.userId || body.userId); break;
      case 'sendMessage': result = sendMessage(body); break;
      case 'markAsRead': result = markMessagesAsRead(body); break;
      
      // Contact Requests (ใหม่)
      case 'requestContact': result = requestContact(body); break;
      case 'respondToRequest': result = respondToRequest(body); break;
      case 'getMyRequests': result = getMyRequests(params.userId || body.userId); break;
      case 'cancelContact': result = cancelContact(body); break;
      
      default: result = { success: false, error: 'Unknown action: ' + action };
    }
    
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ======================================================================
// Helpers
// ======================================================================

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheetHeaders(sheet, name);
  }
  return sheet;
}

function initSheetHeaders(sheet, name) {
  let headers;
  switch (name) {
    case 'Posts':
      headers = ['id', 'userId', 'userName', 'name', 'age', 'phone', 
                 'fromProvince', 'fromDistrict', 'fromSchool', 
                 'toProvince', 'toDistrict', 'subject', 'level', 
                 'note', 'createdAt', 'status'];
      break;
    case 'Messages':
      headers = ['id', 'fromUserId', 'fromUserName', 'toUserId', 'toUserName',
                 'content', 'relatedPostId', 'createdAt', 'read'];
      break;
    case 'Users':
      headers = ['id', 'displayName', 'phone', 'email', 'passwordHash', 'createdAt'];
      break;
    case 'ContactRequests':
      headers = ['id', 'requesterId', 'requesterName', 'targetId', 'targetName',
                 'relatedPostId', 'status', 'requesterMessage', 'createdAt', 'respondedAt'];
      break;
    default: return;
  }
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('white');
  sheet.setFrozenRows(1);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function objectToRow(obj, headers) {
  return headers.map(h => obj[h] !== undefined ? obj[h] : '');
}

function hashPassword(password) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 
    password + 'teacher_swap_salt_2026'
  );
  return digest.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function generateId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 6);
}

// ฟังก์ชันซ่อนเบอร์โทร
function maskPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/[^\d]/g, '');
  if (clean.length < 6) return '***';
  // แสดงแค่ 2 ตัวแรก เพื่อป้องกันการเดา
  return clean.substring(0, 2) + 'X-XXX-XXXX';
}

// ======================================================================
// Users
// ======================================================================

function registerUser(data) {
  if (!data.username || !data.displayName || !data.password) {
    return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
  }
  if (data.password.length < 6) {
    return { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
  }
  
  const sheet = getSheet('Users');
  const users = sheetToObjects(sheet);
  const userId = data.username.trim().toLowerCase().replace(/\s+/g, '_');
  
  if (users.find(u => u.id === userId)) {
    return { success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' };
  }
  
  const user = {
    id: userId,
    displayName: data.displayName.trim(),
    phone: data.phone || '',
    email: data.email || '',
    passwordHash: hashPassword(data.password),
    createdAt: new Date().getTime()
  };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(objectToRow(user, headers));
  
  return { 
    success: true, 
    user: { id: user.id, displayName: user.displayName, phone: user.phone, email: user.email } 
  };
}

function loginUser(data) {
  if (!data.username || !data.password) {
    return { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
  }
  
  const sheet = getSheet('Users');
  const users = sheetToObjects(sheet);
  const userId = data.username.trim().toLowerCase().replace(/\s+/g, '_');
  const user = users.find(u => u.id === userId);
  
  if (!user) return { success: false, error: 'ไม่พบผู้ใช้นี้' };
  if (user.passwordHash !== hashPassword(data.password)) {
    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  }
  
  return { 
    success: true, 
    user: { id: user.id, displayName: user.displayName, phone: user.phone, email: user.email } 
  };
}

// ======================================================================
// Posts - แก้ให้ซ่อนเบอร์เว้นแต่ได้รับอนุญาต
// ======================================================================

function getPosts(viewerId) {
  const sheet = getSheet('Posts');
  const posts = sheetToObjects(sheet).filter(p => p.status !== 'deleted');
  
  // หา contact requests ที่ accepted ของ viewer
  const acceptedContacts = new Set();
  if (viewerId) {
    const crSheet = getSheet('ContactRequests');
    const requests = sheetToObjects(crSheet);
    requests.forEach(r => {
      if (r.status !== 'accepted') return;
      if (r.requesterId === viewerId) acceptedContacts.add(r.targetId);
      if (r.targetId === viewerId) acceptedContacts.add(r.requesterId);
    });
  }
  
  const sanitized = posts.map(p => {
    const isOwner = viewerId && p.userId === viewerId;
    const hasConsent = viewerId && acceptedContacts.has(p.userId);
    
    if (isOwner || hasConsent) {
      return { ...p, phoneRevealed: true };
    } else {
      return { ...p, phone: maskPhone(p.phone), phoneRevealed: false };
    }
  });
  
  return { success: true, posts: sanitized };
}

function createPost(data) {
  const required = ['userId', 'userName', 'name', 'age', 'phone', 
                    'fromProvince', 'fromDistrict', 'toProvince', 
                    'subject', 'level'];
  for (const f of required) {
    if (!data[f]) return { success: false, error: 'ข้อมูลไม่ครบ: ' + f };
  }
  
  const sheet = getSheet('Posts');
  const post = {
    id: data.id || generateId('post'),
    userId: data.userId,
    userName: data.userName,
    name: data.name,
    age: data.age,
    phone: data.phone,
    fromProvince: data.fromProvince,
    fromDistrict: data.fromDistrict,
    fromSchool: data.fromSchool || '',
    toProvince: data.toProvince,
    toDistrict: data.toDistrict || '',
    subject: data.subject,
    level: data.level,
    note: data.note || '',
    createdAt: new Date().getTime(),
    status: 'active'
  };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(objectToRow(post, headers));
  
  return { success: true, post };
}

function deletePost(data) {
  if (!data.postId || !data.userId) return { success: false, error: 'ข้อมูลไม่ครบ' };
  
  const sheet = getSheet('Posts');
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idCol = headers.indexOf('id');
  const userIdCol = headers.indexOf('userId');
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idCol] === data.postId) {
      if (dataRange[i][userIdCol] !== data.userId) {
        return { success: false, error: 'ไม่มีสิทธิ์ลบโพสต์นี้' };
      }
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { success: false, error: 'ไม่พบโพสต์' };
}

// ======================================================================
// Messages
// ======================================================================

function getMessages(userId) {
  if (!userId) return { success: false, error: 'ไม่ระบุ userId' };
  const sheet = getSheet('Messages');
  const allMsgs = sheetToObjects(sheet);
  const myMsgs = allMsgs.filter(m => m.fromUserId === userId || m.toUserId === userId);
  return { success: true, messages: myMsgs };
}

function sendMessage(data) {
  const required = ['fromUserId', 'fromUserName', 'toUserId', 'toUserName', 'content'];
  for (const f of required) {
    if (!data[f]) return { success: false, error: 'ข้อมูลไม่ครบ: ' + f };
  }
  
  const sheet = getSheet('Messages');
  const msg = {
    id: generateId('msg'),
    fromUserId: data.fromUserId,
    fromUserName: data.fromUserName,
    toUserId: data.toUserId,
    toUserName: data.toUserName,
    content: data.content,
    relatedPostId: data.relatedPostId || '',
    createdAt: new Date().getTime(),
    read: false
  };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(objectToRow(msg, headers));
  
  return { success: true, message: msg };
}

function markMessagesAsRead(data) {
  if (!data.userId || !data.fromUserId) return { success: false, error: 'ข้อมูลไม่ครบ' };
  
  const sheet = getSheet('Messages');
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const fromCol = headers.indexOf('fromUserId');
  const toCol = headers.indexOf('toUserId');
  const readCol = headers.indexOf('read');
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][fromCol] === data.fromUserId && dataRange[i][toCol] === data.userId) {
      sheet.getRange(i + 1, readCol + 1).setValue(true);
    }
  }
  
  return { success: true };
}

// ======================================================================
// Contact Requests (ระบบยินยอมแลกเบอร์ - ใหม่)
// ======================================================================

function requestContact(data) {
  const required = ['requesterId', 'requesterName', 'targetId', 'targetName'];
  for (const f of required) {
    if (!data[f]) return { success: false, error: 'ข้อมูลไม่ครบ: ' + f };
  }
  
  if (data.requesterId === data.targetId) {
    return { success: false, error: 'ไม่สามารถขอแลกเบอร์กับตัวเองได้' };
  }
  
  const sheet = getSheet('ContactRequests');
  const existing = sheetToObjects(sheet);
  
  // เช็คคำขอซ้ำที่ยัง active (ระหว่างคู่เดียวกัน — ไม่สนทิศทาง)
  const duplicate = existing.find(r => {
    const samePair = (r.requesterId === data.requesterId && r.targetId === data.targetId) ||
                     (r.requesterId === data.targetId && r.targetId === data.requesterId);
    const isActive = r.status === 'pending' || r.status === 'accepted';
    return samePair && isActive;
  });
  
  if (duplicate) {
    if (duplicate.status === 'accepted') {
      return { success: false, error: 'คุณและอีกฝ่ายได้ยินยอมแลกเบอร์กันอยู่แล้ว' };
    }
    return { success: false, error: 'มีคำขอที่รอการตอบรับอยู่แล้ว' };
  }
  
  const request = {
    id: generateId('cr'),
    requesterId: data.requesterId,
    requesterName: data.requesterName,
    targetId: data.targetId,
    targetName: data.targetName,
    relatedPostId: data.relatedPostId || '',
    status: 'pending',
    requesterMessage: data.requesterMessage || '',
    createdAt: new Date().getTime(),
    respondedAt: ''
  };
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(objectToRow(request, headers));
  
  return { success: true, request };
}

function respondToRequest(data) {
  if (!data.requestId || !data.userId || !data.response) {
    return { success: false, error: 'ข้อมูลไม่ครบ' };
  }
  if (!['accept', 'reject'].includes(data.response)) {
    return { success: false, error: 'response ต้องเป็น accept หรือ reject' };
  }
  
  const sheet = getSheet('ContactRequests');
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idCol = headers.indexOf('id');
  const targetCol = headers.indexOf('targetId');
  const statusCol = headers.indexOf('status');
  const respondedAtCol = headers.indexOf('respondedAt');
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idCol] === data.requestId) {
      if (dataRange[i][targetCol] !== data.userId) {
        return { success: false, error: 'ไม่มีสิทธิ์ตอบคำขอนี้' };
      }
      if (dataRange[i][statusCol] !== 'pending') {
        return { success: false, error: 'คำขอนี้ถูกตอบแล้ว' };
      }
      const newStatus = data.response === 'accept' ? 'accepted' : 'rejected';
      sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
      sheet.getRange(i + 1, respondedAtCol + 1).setValue(new Date().getTime());
      return { success: true, status: newStatus };
    }
  }
  
  return { success: false, error: 'ไม่พบคำขอ' };
}

function getMyRequests(userId) {
  if (!userId) return { success: false, error: 'ไม่ระบุ userId' };
  const sheet = getSheet('ContactRequests');
  const all = sheetToObjects(sheet);
  const mine = all.filter(r => r.requesterId === userId || r.targetId === userId);
  return { success: true, requests: mine };
}

function cancelContact(data) {
  if (!data.requestId || !data.userId) return { success: false, error: 'ข้อมูลไม่ครบ' };
  
  const sheet = getSheet('ContactRequests');
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idCol = headers.indexOf('id');
  const requesterCol = headers.indexOf('requesterId');
  const targetCol = headers.indexOf('targetId');
  const statusCol = headers.indexOf('status');
  const respondedAtCol = headers.indexOf('respondedAt');
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idCol] === data.requestId) {
      if (dataRange[i][requesterCol] !== data.userId && dataRange[i][targetCol] !== data.userId) {
        return { success: false, error: 'ไม่มีสิทธิ์ยกเลิก' };
      }
      sheet.getRange(i + 1, statusCol + 1).setValue('cancelled');
      sheet.getRange(i + 1, respondedAtCol + 1).setValue(new Date().getTime());
      return { success: true };
    }
  }
  
  return { success: false, error: 'ไม่พบคำขอ' };
}

// ======================================================================
// Setup
// ======================================================================

function setupSheets() {
  getSheet('Posts');
  getSheet('Messages');
  getSheet('Users');
  getSheet('ContactRequests');
  Logger.log('Sheets setup complete!');
}
