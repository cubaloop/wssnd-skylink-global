const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${PORT}`;
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'portal_state.json');

const SALT = 'wssnd_skylink_b2b_2026:';
const MASTER_PASS_HASH = 'ccadfb46c1ebe508d072b1c2fbc400655a134046c9515868d26321672ec67b61';

const MASTER_ADMINS = {
  benja: {
    id: 'master_benja',
    username: 'Benja',
    displayName: 'Benjamín Assi',
    role: 'MASTER_ADMIN',
    refCode: 'benja',
    attributionName: 'Benjamín'
  },
  david: {
    id: 'master_david',
    username: 'David',
    displayName: 'David Rodríguez',
    role: 'MASTER_ADMIN',
    refCode: 'david',
    attributionName: 'David'
  }
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

function hashPassword(raw) {
  return crypto.createHash('sha256').update(SALT + String(raw || '')).digest('hex');
}

function ensureState() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    const initial = {
      banner: 'WSSND SKYLINK — Sede Madrid y Sede Dubái',
      categories: [],
      catalog: [],
      suppliers: [],
      buyers: [],
      users: [],
      submissions: []
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return { banner: '', categories: [], catalog: [], suppliers: [], buyers: [], users: [], submissions: [] };
  }
}

function saveState(state) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function sanitizePublicCatalog(catalog) {
  return (catalog || []).filter(i => !i.hidden).map(item => {
    const copy = Object.assign({}, item);
    delete copy.supplier_ref;
    delete copy.supplier_net_price;
    delete copy.commission_type;
    delete copy.commission_value;
    return copy;
  });
}

function readJsonBody(req, maxBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxBytes) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-WSSND-Admin-Hash',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const cleanPath = req.url.split('?')[0];

  if (cleanPath === '/healthz' || cleanPath === '/api/config') {
    return sendJson(res, 200, {
      status: 'ok',
      site: 'wssnd-skylink-global',
      entities: [
        'WSSND SKYLINK CARGO GLOBAL, S.L. (Madrid, ES - NIF B05861943)',
        'WSSND Skylink General Trading FZCO (Dubai, UAE)'
      ],
      timestamp: new Date().toISOString(),
      wakelock: 'active-24-7'
    });
  }

  // Block direct static access to private /data folder
  if (cleanPath === '/data' || cleanPath.startsWith('/data/')) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // API: Portal State (Public vs Authenticated Master Admin)
  if (cleanPath === '/api/portal-state' && req.method === 'GET') {
    const state = ensureState();
    const adminHeader = req.headers['x-wssnd-admin-hash'] || '';
    const isAdmin = adminHeader === MASTER_PASS_HASH;
    if (isAdmin) {
      const safeUsers = (state.users || []).map(u => {
        const c = Object.assign({}, u);
        delete c.password_hash;
        return c;
      });
      return sendJson(res, 200, {
        ok: true,
        isAdmin: true,
        banner: state.banner,
        categories: state.categories || [],
        catalog: state.catalog || [],
        suppliers: state.suppliers || [],
        buyers: state.buyers || [],
        users: safeUsers,
        submissions: state.submissions || []
      });
    }
    return sendJson(res, 200, {
      ok: true,
      isAdmin: false,
      banner: state.banner,
      categories: state.categories || [],
      catalog: sanitizePublicCatalog(state.catalog || [])
    });
  }

  if (cleanPath === '/api/portal-state' && req.method === 'POST') {
    const adminHeader = req.headers['x-wssnd-admin-hash'] || '';
    if (adminHeader !== MASTER_PASS_HASH) {
      return sendJson(res, 403, { ok: false, error: 'No autorizado' });
    }
    try {
      const body = await readJsonBody(req);
      const state = ensureState();
      if (typeof body.banner === 'string') state.banner = body.banner;
      if (Array.isArray(body.categories)) state.categories = body.categories;
      if (Array.isArray(body.catalog)) state.catalog = body.catalog;
      if (Array.isArray(body.suppliers)) state.suppliers = body.suppliers;
      if (Array.isArray(body.buyers)) state.buyers = body.buyers;
      if (Array.isArray(body.submissions)) state.submissions = body.submissions;
      saveState(state);
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  // API: Login (Master Admins Benja/David + Registered Buyers/Suppliers)
  if (cleanPath === '/api/public/login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const rawUser = String(body.username || '').trim();
      const keyUser = rawUser.toLowerCase();
      const passHash = body.password_hash || hashPassword(body.password || '');

      if ((keyUser === 'benja' || keyUser === 'david') && passHash === MASTER_PASS_HASH) {
        return sendJson(res, 200, {
          ok: true,
          user: Object.assign({}, MASTER_ADMINS[keyUser], { adminToken: MASTER_PASS_HASH })
        });
      }

      const state = ensureState();
      const found = (state.users || []).find(u =>
        (String(u.username || '').toLowerCase() === keyUser || String(u.email || '').toLowerCase() === keyUser) &&
        u.password_hash === passHash
      );
      if (!found) {
        return sendJson(res, 401, { ok: false, error: 'Usuario o contraseña incorrectos.' });
      }
      const safeUser = Object.assign({}, found);
      delete safeUser.password_hash;
      return sendJson(res, 200, { ok: true, user: safeUser });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  // API: Register Buyer or Supplier (with silent referral attribution)
  if (cleanPath === '/api/public/register' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const role = body.role === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER';
      const username = String(body.username || body.email || '').trim();
      if (!username || username.length < 3) {
        return sendJson(res, 400, { ok: false, error: 'Indica un usuario o correo válido.' });
      }
      const keyUser = username.toLowerCase();
      if (keyUser === 'benja' || keyUser === 'david') {
        return sendJson(res, 400, { ok: false, error: 'Ese nombre de usuario está reservado.' });
      }

      const state = ensureState();
      state.users = state.users || [];
      if (state.users.some(u => String(u.username || '').toLowerCase() === keyUser || (body.email && String(u.email || '').toLowerCase() === String(body.email).toLowerCase()))) {
        return sendJson(res, 400, { ok: false, error: 'Ya existe una cuenta registrada con ese usuario o correo.' });
      }

      const capturedBy = ['Benjamín', 'David', 'Se registró solo'].includes(body.captured_by)
        ? body.captured_by
        : 'Se registró solo';

      const newUser = {
        id: 'usr_' + Date.now(),
        created_at: new Date().toISOString(),
        role,
        username,
        displayName: String(body.name || body.contact_person || body.company_name || username).trim(),
        company_name: String(body.company_name || '').trim(),
        contact_person: String(body.contact_person || body.name || '').trim(),
        phone: String(body.phone || '').trim(),
        email: String(body.email || '').trim(),
        products_or_interest: String(body.products_or_interest || '').trim(),
        captured_by: capturedBy,
        password_hash: body.password_hash || hashPassword(body.password || '')
      };
      state.users.unshift(newUser);

      const today = new Date().toISOString().slice(0, 10);
      if (role === 'SUPPLIER') {
        state.suppliers = state.suppliers || [];
        state.suppliers.unshift({
          id: 'sup_' + Date.now(),
          user_id: newUser.id,
          company_name: newUser.company_name || newUser.displayName,
          contact_person: newUser.contact_person || newUser.displayName,
          phone: newUser.phone || newUser.email,
          products: newUser.products_or_interest || 'Pendiente subida de catálogo',
          prices: 'En revisión inicial',
          closed_deals: 0,
          captured_by: capturedBy,
          sector: 'GENERAL',
          status: 'Registrado en Portal'
        });
      } else {
        state.buyers = state.buyers || [];
        state.buyers.unshift({
          id: 'buy_' + Date.now(),
          user_id: newUser.id,
          name: newUser.displayName,
          company: newUser.company_name || 'Particular / Independiente',
          contact: [newUser.phone, newUser.email].filter(Boolean).join(' | '),
          product_required: newUser.products_or_interest || 'Registro general como comprador',
          request_date: today,
          status: 'Abierto',
          close_date: '',
          total_amount: 0,
          profit_amount: 0,
          captured_by: capturedBy
        });
      }

      saveState(state);
      const safeUser = Object.assign({}, newUser);
      delete safeUser.password_hash;
      return sendJson(res, 200, { ok: true, user: safeUser });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  // API: Buyer RFQ from cotizar.html
  if (cleanPath === '/api/public/rfq' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const state = ensureState();
      state.buyers = state.buyers || [];
      const capturedBy = ['Benjamín', 'David', 'Se registró solo'].includes(body.captured_by)
        ? body.captured_by
        : 'Se registró solo';
      const entry = {
        id: 'buy_' + Date.now(),
        user_id: body.user_id || '',
        name: String(body.name || '').trim(),
        company: String(body.company || 'Particular / Empresa').trim(),
        contact: [body.phone, body.email].filter(Boolean).join(' | '),
        product_required: `${body.item || ''} (${body.quantity || '1 ud.'} -> ${body.destination || ''})`.trim(),
        request_date: new Date().toISOString().slice(0, 10),
        status: 'Abierto',
        close_date: '',
        total_amount: 0,
        profit_amount: 0,
        captured_by: capturedBy,
        notes: String(body.notes || '').trim()
      };
      state.buyers.unshift(entry);
      saveState(state);
      return sendJson(res, 200, { ok: true, entry });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  // API: Supplier Catalog Submission (Pending Review by David or Benja)
  if (cleanPath === '/api/public/supplier-submission' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const state = ensureState();
      state.submissions = state.submissions || [];
      const sub = {
        id: 'sub_' + Date.now(),
        created_at: new Date().toISOString(),
        supplier_user_id: String(body.supplier_user_id || ''),
        company_name: String(body.company_name || '').trim(),
        contact_person: String(body.contact_person || '').trim(),
        phone: String(body.phone || '').trim(),
        captured_by: ['Benjamín', 'David', 'Se registró solo'].includes(body.captured_by) ? body.captured_by : 'Se registró solo',
        category: String(body.category || 'COMMODITIES'),
        hub_origin: String(body.hub_origin || 'DUBAI_IFZA'),
        product_title: String(body.product_title || '').trim(),
        net_price: Number(body.net_price || 0),
        currency: String(body.currency || 'USD'),
        unit_label: String(body.unit_label || '').trim(),
        specs: String(body.specs || '').trim(),
        image_data: String(body.image_data || ''),
        catalog_doc_name: String(body.catalog_doc_name || ''),
        catalog_doc_data: String(body.catalog_doc_data || ''),
        review_status: 'PENDING_REVIEW'
      };
      state.submissions.unshift(sub);
      saveState(state);
      return sendJson(res, 200, { ok: true, submission: sub });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  // API: Supplier fetches only their own submissions
  if (cleanPath === '/api/public/my-submissions' && req.method === 'GET') {
    const urlObj = new URL(req.url, 'http://localhost');
    const uid = urlObj.searchParams.get('uid') || '';
    const state = ensureState();
    const mine = (state.submissions || []).filter(s => uid && String(s.supplier_user_id) === String(uid));
    return sendJson(res, 200, { ok: true, submissions: mine });
  }

  let filePath = path.join(__dirname, cleanPath === '/' ? 'index.html' : cleanPath);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(__dirname, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[WSSND SKYLINK Global Portal v7] Server listening on port ${PORT}`);
});

// Rule 2.2: Mandatory 24/7 Wake-Lock every 5 minutes (300,000 ms) to /healthz
setInterval(() => {
  const target = `${PUBLIC_URL}/healthz`;
  const client = target.startsWith('https') ? https : http;
  client.get(target, (res) => {
    res.resume();
  }).on('error', () => {});
}, 5 * 60 * 1000);
