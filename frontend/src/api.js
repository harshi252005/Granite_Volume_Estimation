// Auto-detect: use current hostname when running in browser (works on both localhost and Wi-Fi IP),
// use the PC's Wi-Fi IP when running inside native Android APK.
export const DEFAULT_PC_WIFI_IP = '192.168.1.49';

export function normalizeServerUrl(input) {
  if (!input) return '';
  let str = input.trim();
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    if (str.includes('.trycloudflare.com') || str.includes('.ngrok-free.app') || str.includes('.loca.lt')) {
      str = `https://${str}`;
    } else {
      str = `http://${str}`;
    }
  }
  try {
    const u = new URL(str);
    if (!u.port && /^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) {
      u.port = '8000';
    }
    let p = u.pathname.replace(/\/+$/, '');
    if (!p.endsWith('/api')) {
      p = p ? `${p}/api` : '/api';
    }
    u.pathname = p;
    return u.toString().replace(/\/+$/, '');
  } catch {
    str = str.replace(/\/+$/, '');
    if (!str.endsWith('/api')) str = `${str}/api`;
    return str;
  }
}

export function getApiBaseUrl() {
  if (typeof window === 'undefined') return 'http://localhost:8000/api';
  const saved = localStorage.getItem('backend_url') || localStorage.getItem('backend_ip');
  if (saved) {
    return normalizeServerUrl(saved);
  }
  const isNative = !!(window.Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:');
  if (isNative) {
    return `http://${DEFAULT_PC_WIFI_IP}:8000/api`;
  }
  const host = window.location.hostname || 'localhost';
  return `http://${host}:8000/api`;
}

export function setBackendServer(urlOrIp) {
  if (!urlOrIp || !urlOrIp.trim()) {
    localStorage.removeItem('backend_url');
    localStorage.removeItem('backend_ip');
    return getApiBaseUrl();
  }
  const normalized = normalizeServerUrl(urlOrIp);
  localStorage.setItem('backend_url', normalized);
  return normalized;
}

/**
 * Returns extra headers needed to bypass localtunnel / cloudflare tunnel splash pages.
 * - loca.lt tunnels require `bypass-tunnel-reminder: true`
 * - Sent on ALL requests so we never hit the HTML captcha page.
 */
export function getTunnelBypassHeaders() {
  return {
    'bypass-tunnel-reminder': 'true',
    'User-Agent': 'SmartGraniteApp/2.0',
  };
}

/**
 * Safe JSON parser — if the server returns an HTML error page (e.g. localtunnel splash),
 * throws a friendly error instead of the cryptic "unexpected token '<'" message.
 */
async function safeJson(res) {
  const text = await res.text();
  if (text.trimStart().startsWith('<')) {
    // Server returned HTML — likely a tunnel splash/captcha page or proxy error
    if (res.status === 511 || text.includes('loca.lt') || text.includes('localtunnel')) {
      throw new Error(
        'Tunnel requires browser visit first. Open the tunnel URL in your phone\'s browser, ' +
        'click "Click to Continue", then come back to the app and try again.'
      );
    }
    throw new Error(`Server returned an HTML page (HTTP ${res.status}). Check the server URL is correct and the backend is running.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid response from server (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }
}

export async function testServerConnection(targetUrl) {
  const base = targetUrl ? normalizeServerUrl(targetUrl) : getApiBaseUrl();
  const root = base.replace(/\/api\/?$/, '');
  const bypassHeaders = getTunnelBypassHeaders();

  try {
    // 1. Try the health/ping endpoint with tunnel bypass headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${root}/api/health`, {
      method: 'GET',
      headers: bypassHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok || res.status === 200) {
      return { ok: true, url: base };
    }
    // HTTP 511 = localtunnel splash page (no bypass worked via GET — need browser visit)
    if (res.status === 511) {
      return {
        ok: false,
        url: base,
        error: 'HTTP 511 — Localtunnel requires a one-time browser visit. Open the tunnel URL in your phone browser, tap "Click to Continue", then try again here.',
      };
    }
  } catch {}

  try {
    // 2. Try auth endpoint with bypass headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { ...bypassHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: '__ping__', password: '__ping__' }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.status === 511) {
      return {
        ok: false,
        url: base,
        error: 'HTTP 511 — Open the tunnel URL in your phone\'s browser first, tap "Click to Continue", then try again.',
      };
    }
    // 400/401 = server alive and responding with proper JSON errors
    if (res.status === 400 || res.status === 401 || res.status === 200 || res.ok) {
      return { ok: true, url: base };
    }
    return { ok: false, url: base, error: `HTTP ${res.status} — Check the server URL and that the backend is running.` };
  } catch (err) {
    return {
      ok: false,
      url: base,
      error: err.name === 'AbortError'
        ? 'Connection timed out — check Wi-Fi / IP address'
        : (err.message || 'Server unreachable'),
    };
  }
}


export const getToken = () => {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem('token');
  return (t && t !== 'undefined' && t !== 'null' && t.trim() !== '') ? t.trim() : null;
};

const headers = (json = true) => {
  const token = getToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

function createFallbackImageFile(blockId) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createLinearGradient(0, 0, 480, 360);
  grad.addColorStop(0, '#1E293B');
  grad.addColorStop(0.5, '#0F172A');
  grad.addColorStop(1, '#1A365D');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 360);

  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, 400, 280);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AP MINES & GEOLOGY', 240, 140);
  
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(blockId || 'BLK-GRANITE', 240, 180);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px sans-serif';
  ctx.fillText('AI Measurement Reference Image', 240, 220);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob], `${blockId || 'block'}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}

async function request(method, path, body, formData = false) {
  const bypassHeaders = getTunnelBypassHeaders();
  const token = getToken();
  const authHeaders = formData
    ? { ...bypassHeaders, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    : { ...headers(), ...bypassHeaders };
  const opts = {
    method,
    headers: authHeaders,
  };
  if (body) opts.body = formData ? body : JSON.stringify(body);
  const baseUrl = getApiBaseUrl();
  const res = await fetch(baseUrl + path, opts);

  if (res.status === 511) {
    throw new Error(
      'Tunnel requires browser visit. Open the tunnel URL in your phone browser, ' +
      'tap "Click to Continue", then come back and try again.'
    );
  }

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  if (!res.ok) {
    let err;
    try {
      err = await safeJson(res);
    } catch (parseErr) {
      throw parseErr;
    }
    let errorMsg = 'Request failed';
    if (Array.isArray(err?.detail)) {
      errorMsg = err.detail
        .map(d => `${d.loc ? d.loc.filter(x => x !== 'body').join('.') + ': ' : ''}${d.msg}`)
        .join('; ');
    } else if (typeof err?.detail === 'string') {
      errorMsg = err.detail;
    } else if (err?.message) {
      errorMsg = err.message;
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) return null;
  return safeJson(res);
}

export const api = {
  // ── Auth  (prefix: /api/auth) ─────────────────────────────────────────────
  login: async (username, password) => {
    const form = new URLSearchParams({ username, password });
    const bypassHeaders = getTunnelBypassHeaders();
    const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { ...bypassHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (res.status === 511) {
      throw new Error(
        'Tunnel requires browser activation. Open the tunnel URL (e.g. https://xxxx.loca.lt) in ' +
        'your phone\'s browser, tap "Click to Continue", then return to the app and try logging in again.'
      );
    }
    return safeJson(res);
  },
  getMe: () => request('GET', '/auth/me'),

  createUser: (data) => request('POST', '/auth/register', data),

  // ── Users  (special endpoint inside auth router) ───────────────────────────
  getUsers: () => request('GET', '/users'),                    // GET /api/users
  deleteUser: (id) => request('DELETE', `/users/${id}`),
  updateUser: (id, data) => request('PUT', `/users/${id}`, data),

  // ── Blocks  (prefix: /api/blocks) ─────────────────────────────────────────
  getBlocks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/blocks${q ? '?' + q : ''}`);
  },
  getBlock: (id) => request('GET', `/blocks/${id}`),
  trackBlock: (id) => request('GET', `/blocks/${id}/track`),
  createBlock: async (data) => {
    let form;
    if (data instanceof FormData) {
      form = data;
    } else {
      form = new FormData();
      const blockId = data.block_id || data.id || `BLK-${Date.now().toString().slice(-6)}`;
      form.append('block_id', blockId);
      form.append('quarry_id', String(data.quarry_id || 1));
      if (data.gps) form.append('gps', data.gps);
      if (data.undressed_id) form.append('undressed_id', data.undressed_id);
      if (data.block_type) form.append('block_type', data.block_type);
      if (data.granite_type || data.graniteType) {
        form.append('granite_type', data.granite_type || data.graniteType);
      }
      if (data.internal_number || data.internalNumber) {
        form.append('internal_number', data.internal_number || data.internalNumber);
      }
      if (data.length) form.append('length', String(data.length));
      if (data.breadth) form.append('breadth', String(data.breadth));
      if (data.height) form.append('height', String(data.height));
      if (data.volume) form.append('volume', String(data.volume));
      if (data.length_readings) form.append('length_readings', typeof data.length_readings === 'string' ? data.length_readings : JSON.stringify(data.length_readings));
      if (data.breadth_readings) form.append('breadth_readings', typeof data.breadth_readings === 'string' ? data.breadth_readings : JSON.stringify(data.breadth_readings));
      if (data.height_readings) form.append('height_readings', typeof data.height_readings === 'string' ? data.height_readings : JSON.stringify(data.height_readings));
      if (data.measurement_method) form.append('measurement_method', data.measurement_method);

      let file = data.file;
      if (!file) {
        file = await createFallbackImageFile(blockId);
      }
      if (file) {
        form.append('file', file, file.name || `${blockId}.jpg`);
      }
    }
    return request('POST', '/blocks', form, true);
  },
  analyzeDressedBlock: (data) => {
    if (data instanceof FormData) {
      return request('POST', '/blocks/analyze-dressed', data, true);
    }
    const form = new FormData();
    if (data?.views && typeof data.views === 'object') {
      Object.entries(data.views).forEach(([k, v]) => {
        if (v?.file) form.append(k, v.file);
        else if (v instanceof File) form.append(k, v);
      });
    }
    if (data?.files && Array.isArray(data.files)) {
      data.files.forEach(f => form.append('files', f));
    }
    if (data?.file) form.append('file', data.file);
    if (data?.undressed_id) form.append('undressed_id', data.undressed_id);
    if (data?.granite_type) form.append('granite_type', data.granite_type);
    if (data?.quarry_id) form.append('quarry_id', String(data.quarry_id));
    return request('POST', '/blocks/analyze-dressed', form, true);
  },
  analyzeUndressedBlock: (data) => {
    if (data instanceof FormData) {
      return request('POST', '/blocks/analyze-undressed', data, true);
    }
    const form = new FormData();
    if (Array.isArray(data)) {
      data.forEach(f => form.append('files', f));
    } else if (data?.file) {
      form.append('file', data.file);
    } else if (data instanceof File) {
      form.append('file', data);
    }
    return request('POST', '/blocks/analyze-undressed', form, true);
  },
  assessUndressedBlock: (data) => {
    if (data instanceof FormData) {
      return request('POST', '/assessment/undressed', data, true);
    }
    const form = new FormData();
    if (data?.views && typeof data.views === 'object') {
      Object.entries(data.views).forEach(([k, v]) => {
        if (v?.file) form.append(k, v.file);
        else if (v instanceof File) form.append(k, v);
      });
    }
    if (data?.camera) form.append('camera', data.camera);
    if (data?.marker_mm) form.append('marker_mm', data.marker_mm);
    if (data?.allowance_mm) form.append('allowance_mm', data.allowance_mm);
    if (data?.block_id) form.append('block_id', data.block_id);
    return request('POST', '/assessment/undressed', form, true);
  },
  assessDressedBlock: (data) => {
    if (data instanceof FormData) {
      return request('POST', '/assessment/dressed', data, true);
    }
    const form = new FormData();
    if (data?.views && typeof data.views === 'object') {
      Object.entries(data.views).forEach(([k, v]) => {
        if (v?.file) form.append(k, v.file);
        else if (v instanceof File) form.append(k, v);
      });
    }
    if (data?.camera) form.append('camera', data.camera);
    if (data?.marker_mm) form.append('marker_mm', data.marker_mm);
    if (data?.block_id) form.append('block_id', data.block_id);
    if (data?.undressed_id) form.append('undressed_id', data.undressed_id);
    return request('POST', '/assessment/dressed', form, true);
  },
  assessWalkaround: (data) => {
    const form = new FormData();
    if (data?.files && Array.isArray(data.files)) {
      data.files.forEach(f => form.append('images', f));
    }
    if (data?.allowance_mm) form.append('allowance_mm', data.allowance_mm);
    if (data?.marker_mm) form.append('marker_mm', String(data.marker_mm));
    if (data?.block_id) form.append('block_id', data.block_id);
    return request('POST', '/assessment/walkaround', form, true);
  },
  assessWalkaroundVideo: (data) => {
    const form = new FormData();
    if (data?.video) {
      form.append('video', data.video);
    }
    if (data?.allowance_mm) form.append('allowance_mm', data.allowance_mm);
    if (data?.marker_mm) form.append('marker_mm', String(data.marker_mm));
    if (data?.block_id) form.append('block_id', data.block_id);
    if (data?.target_frames) form.append('target_frames', String(data.target_frames));
    return request('POST', '/assessment/walkaround-video', form, true);
  },
  registerUndressedBlock: async (data) => {
    if (data instanceof FormData) {
      return request('POST', '/blocks/register-undressed-form', data, true);
    }
    if (data.file || data.files) {
      const form = new FormData();
      form.append('quarry_id', String(data.quarry_id || data.quarryId || 1));
      form.append('undressed_length', String(data.undressed_length || data.length || 0));
      form.append('undressed_breadth', String(data.undressed_breadth || data.breadth || 0));
      form.append('undressed_height', String(data.undressed_height || data.height || 0));
      if (data.gps) form.append('gps', data.gps);
      if (data.granite_type || data.graniteType) {
        form.append('granite_type', data.granite_type || data.graniteType);
      }
      if (data.length_readings) form.append('length_readings', typeof data.length_readings === 'string' ? data.length_readings : JSON.stringify(data.length_readings));
      if (data.breadth_readings) form.append('breadth_readings', typeof data.breadth_readings === 'string' ? data.breadth_readings : JSON.stringify(data.breadth_readings));
      if (data.height_readings) form.append('height_readings', typeof data.height_readings === 'string' ? data.height_readings : JSON.stringify(data.height_readings));

      if (data.block_id || data.blockId) {
        form.append('block_id', data.block_id || data.blockId);
      }

      const mainFile = data.file || (Array.isArray(data.files) ? data.files[0] : null);
      if (mainFile) {
        form.append('file', mainFile, mainFile.name || 'pit_photo.jpg');
      }
      return request('POST', '/blocks/register-undressed-form', form, true);
    }
    return request('POST', '/blocks/register-undressed', {
      quarry_id: parseInt(data.quarry_id || data.quarryId || 1),
      undressed_length: parseFloat(data.undressed_length || data.length || 0),
      undressed_breadth: parseFloat(data.undressed_breadth || data.breadth || 0),
      undressed_height: parseFloat(data.undressed_height || data.height || 0),
      gps: data.gps || null,
      granite_type: data.granite_type || data.graniteType || 'Black Galaxy Granite',
      length_readings: data.length_readings ? (typeof data.length_readings === 'string' ? data.length_readings : JSON.stringify(data.length_readings)) : null,
      breadth_readings: data.breadth_readings ? (typeof data.breadth_readings === 'string' ? data.breadth_readings : JSON.stringify(data.breadth_readings)) : null,
      height_readings: data.height_readings ? (typeof data.height_readings === 'string' ? data.height_readings : JSON.stringify(data.height_readings)) : null,
    });
  },
  updateBlock: (id, data) => request('PUT', `/blocks/${id}`, data),
  deleteBlock: (id) => request('DELETE', `/blocks/${id}`),
  submitBlockToDmgo: (id) => request('PUT', `/blocks/${id}/submit`),
  approveBlock: (id, data = {}) => {
    return request('POST', `/blocks/${id}/dmgo-verify`, {
      action: 'approve',
      remarks: data.remarks || 'Approved by DMGO',
    });
  },
  rejectBlock: (id, data = {}) => {
    return request('POST', `/blocks/${id}/dmgo-verify`, {
      action: 'reject',
      remarks: data.remarks || 'Rejected by DMGO',
    });
  },
  modifyApproveBlock: (id, data = {}) => {
    return request('POST', `/blocks/${id}/dmgo-verify`, {
      action: 'modify_approve',
      length: data.length,
      breadth: data.breadth,
      height: data.height,
      granite_type: data.granite_type,
      remarks: data.remarks || 'Measurements modified and approved by DMGO',
    });
  },
  overrideBlock: (id, length, breadth, height, granite_type) =>
    request('POST', `/blocks/${id}/override`, { length, breadth, height, granite_type }),
  raiseCheckRequest: (blockIds, remarks = 'Submitted for DMGO check measurement') =>
    request('POST', '/blocks/raise-check-request', {
      block_ids: Array.isArray(blockIds) ? blockIds : [blockIds],
      remarks,
    }),

  // ── Images ────────────────────────────────────────────────────────────────
  uploadImage: (blockId, file, viewType = 'front') => {
    const form = new FormData();
    form.append('file', file);
    form.append('view_type', viewType);
    return request('POST', `/blocks/${blockId}/images`, form, true);
  },

  // ── AI Analysis ──────────────────────────────────────────────────────────
  analyzeBlock: (blockId) => request('POST', `/blocks/analyze`, { block_id: blockId }),

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  getDashboardStats: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/dashboard/stats${q ? '?' + q : ''}`);
  },

  // ── Quarries  (prefix: /api/quarries) ─────────────────────────────────────
  getQuarries: () => request('GET', '/quarries'),
  getGISQuarries: () => request('GET', '/gis/quarries'),
  getQuarry: (id) => request('GET', `/quarries/${id}`),
  createQuarry: (data) => request('POST', '/quarries', data),
  updateQuarry: (id, data) => request('PUT', `/quarries/${id}`, data),

  // ── Weighbridge  (prefix: /api/weighbridge) ───────────────────────────────
  getWeighbridgeHistory: () => request('GET', '/weighbridge'),
  submitWeighbridge: (data) => {
    const form = new FormData();
    form.append('actual_weight', String(data.actual_weight));
    return request('POST', `/weighbridge/${data.block_id}`, form, true);
  },
  getWeighbridgeEntry: (blockId) => request('GET', `/weighbridge/${blockId}`),
  // Re-weigh: operator submits corrected weight for a flagged block
  reweighBlock: (blockId, actualWeight, remarks = 'Re-weigh reading after calibration check') => {
    const form = new FormData();
    form.append('actual_weight', String(actualWeight));
    form.append('remarks', remarks);
    return request('PUT', `/weighbridge/${blockId}/reweigh`, form, true);
  },
  // DMGO Override: approve a flagged block with official justification
  overrideWeighbridge: (blockId, remarks) => {
    const form = new FormData();
    form.append('remarks', remarks);
    return request('PUT', `/weighbridge/${blockId}/override`, form, true);
  },
  // Escalate: send flagged block to enforcement for physical inspection
  escalateWeighbridge: (blockId, remarks = 'Escalated to enforcement for physical inspection') => {
    const form = new FormData();
    form.append('remarks', remarks);
    return request('PUT', `/weighbridge/${blockId}/escalate`, form, true);
  },

  // ── Dispatch  (prefix: /api/dispatch) ────────────────────────────────────
  getDispatches: () => request('GET', '/dispatch'),
  getTransitTrack: (blockId) => request('GET', `/dispatch/${blockId}/transit-track`),
  requestDispatch: (data) => {
    const form = new FormData();
    form.append('vehicle_number', data.vehicleNumber || data.vehicle_number || '');
    form.append('driver_name', data.driverName || data.driver_name || '');
    form.append('destination', data.destination || '');
    if (data.ePermit || data.e_permit_number) {
      form.append('e_permit_number', data.ePermit || data.e_permit_number);
    }
    if (data.valid_until || data.validUntil) {
      form.append('valid_until', data.valid_until || data.validUntil);
    }
    if (data.validity_hours || data.validityHours) {
      form.append('validity_hours', String(data.validity_hours || data.validityHours));
    }
    return request('POST', `/dispatch/${data.blockId || data.block_id}`, form, true);
  },
  issueTransitPass: (data) => {
    const form = new FormData();
    form.append('vehicle_number', data.vehicleNumber || data.vehicle_number || '');
    form.append('driver_name', data.driverName || data.driver_name || '');
    form.append('destination', data.destination || '');
    if (data.valid_until || data.validUntil) {
      form.append('valid_until', data.valid_until || data.validUntil);
    }
    if (data.validity_hours || data.validityHours) {
      form.append('validity_hours', String(data.validity_hours || data.validityHours));
    }
    if (data.ePermit || data.e_permit_number) {
      form.append('e_permit_number', data.ePermit || data.e_permit_number);
    }
    return request('POST', `/dispatch/${data.blockId || data.block_id}/issue-pass`, form, true);
  },
  getDispatch: (blockId) => request('GET', `/dispatch/${blockId}`),
  confirmDelivery: (blockId) => request('POST', `/dispatch/${blockId}/receive`),

  // ── Reports  (prefix: /api/reports) ──────────────────────────────────────
  getAnalytics: () => request('GET', '/reports'),
  getDashboardReport: () => request('GET', '/reports'),

  // ── Audit Logs  ───────────────────────────────────────────────────────────
  getAuditLogs: (blockId) => request('GET', blockId ? `/audit-logs/${blockId}` : '/audit-logs'),

  // ── OMEPS 2.0 Integration (prefix: /api/integration/omeps and /api/omeps) ──
  syncOmeps: () => request('POST', `/integration/omeps/sync`),
  getOmepsLogs: () => request('GET', '/integration/omeps/logs'),
  getOmepsBlocks: () => request('GET', '/integration/omeps/blocks'),
  getOmepsValidation: (blockId) => request('GET', `/integration/omeps/validation/${blockId}`),

  // ── Chatbot  (prefix: /api/chatbot) ──────────────────────────────────────
  chatbot: (message, lang = 'en') => request('POST', '/chatbot/', { message, lang }),

  // ── Enforcement (prefix: /api/enforcement) ───────────────────────────────
  enforcementScan: (blockId) => request('GET', `/enforcement/scan/${blockId}`),
  enforcementDashboardStats: () => request('GET', '/enforcement/dashboard/stats'),
  getFlaggedTransits: () => request('GET', '/enforcement/flagged'),
  searchByVehicle: (vehicleNumber) =>
    request('GET', `/enforcement/vehicles/search?vehicle_number=${encodeURIComponent(vehicleNumber)}`),
  roadsideCheck: (data) => request('POST', '/enforcement/roadside-check', data),
  issueSeizerNotice: (data) => request('POST', '/enforcement/seizure-notice', data),

  // ── Statutory Challan ─────────────────────────────────────────────────────
  getChallan: (blockId) => request('GET', `/blocks/${blockId}/challan`),

  // ── Boulder Children ──────────────────────────────────────────────────────
  getBoulderChildren: (blockId) => request('GET', `/blocks/${blockId}/children`),

  // ── Citizen Portal (prefix: /api/citizen) ─────────────────────────────────
  getCitizenGraniteTypes: () => request('GET', '/citizen/granite-types'),
  calculateCitizenPlan: (data) => request('POST', '/citizen/calculate', data),
  getCitizenPlans: () => request('GET', '/citizen/plans'),
  createCitizenPlan: (data) => request('POST', '/citizen/plans', data),
  getCitizenPlan: (planId) => request('GET', `/citizen/plans/${planId}`),
  updateCitizenPlanStatus: (planId, status) => request('PATCH', `/citizen/plans/${planId}/status?new_status=${status}`),
  dispatchCitizenQuota: (planId, data) => request('POST', `/citizen/plans/${planId}/dispatch`, data),

  // ── System Thresholds & Models Status (prefix: /api/settings) ─────────────
  getSettings: () => request('GET', '/settings'),
  updateSettings: (data) => request('POST', '/settings', data),
  getModelsStatus: () => request('GET', '/settings/models-status'),
  testVolumeCategory: (data) => request('POST', '/settings/test-volume', data),
};


