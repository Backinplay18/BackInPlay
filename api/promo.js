// Promo code API via Supabase (replaces JSONBin)
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const DEFAULT_PROMOS = {
  'GOLFING1': {
    type:     'fixed',
    value:    7,
    minOrder: 50,
    expires:  '2026-12-31',
    usedBy:   []
  }
};

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}${path}`);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getPromos() {
  try {
    const rows = await supabaseRequest('GET', '/rest/v1/store?key=eq.promos&select=value', null);
    if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
      return rows[0].value;
    }
  } catch(e) {}
  return DEFAULT_PROMOS;
}

async function savePromos(promos) {
  await supabaseRequest('POST', '/rest/v1/store', {
    key: 'promos',
    value: promos,
    updated_at: new Date().toISOString()
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  // ── VALIDATE a promo code ──
  if (action === 'validate' && req.method === 'POST') {
    const { code, contact, orderTotal } = req.body;
    const key = (code || '').toUpperCase().trim();

    const promos = await getPromos();
    const promo = promos[key];
    if (!promo) return res.status(200).json({ valid: false, message: 'Invalid promo code.' });

    if (new Date() > new Date(promo.expires)) {
      return res.status(200).json({ valid: false, message: 'This promo code has expired.' });
    }

    if (promo.minOrder && orderTotal < promo.minOrder) {
      return res.status(200).json({ valid: false, message: `This code requires a minimum order of $${promo.minOrder}.` });
    }

    const usedBy = promo.usedBy || [];
    if (contact && usedBy.includes(contact.toLowerCase())) {
      return res.status(200).json({ valid: false, message: 'You have already used this promo code.' });
    }

    if (promo.maxUses && usedBy.length >= promo.maxUses) {
      return res.status(200).json({ valid: false, message: 'This promo code has reached its usage limit.' });
    }

    let discount = 0;
    let description = '';
    if (promo.type === 'fixed') {
      discount = promo.value;
      description = `$${promo.value} off`;
    } else if (promo.type === 'percent') {
      discount = Math.round((orderTotal * promo.value / 100) * 100) / 100;
      description = `${promo.value}% off`;
    } else if (promo.type === 'shipping') {
      discount = 0;
      description = 'Free shipping';
    }

    return res.status(200).json({
      valid: true,
      type: promo.type,
      discount,
      description,
      message: `✅ ${description} applied!`
    });
  }

  // ── REDEEM a promo code ──
  if (action === 'redeem' && req.method === 'POST') {
    const { code, contact } = req.body;
    const key = (code || '').toUpperCase().trim();

    const promos = await getPromos();
    if (promos[key] && contact) {
      if (!promos[key].usedBy) promos[key].usedBy = [];
      promos[key].usedBy.push(contact.toLowerCase());
      try { await savePromos(promos); } catch(e) {}
    }

    return res.status(200).json({ success: true });
  }

  // ── GET all promos (dashboard) ──
  if (action === 'get' && req.method === 'GET') {
    const promos = await getPromos();
    return res.status(200).json(promos);
  }

  // ── SAVE promos (dashboard) ──
  if (action === 'save' && req.method === 'POST') {
    try { await savePromos(req.body); } catch(e) {}
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
};
