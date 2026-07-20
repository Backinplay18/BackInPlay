// Promo code API — get and save promo codes
const https = require('https');

const JBIN_KEY   = process.env.JBIN_KEY || '$2a$10$k7iiAvrIhQYE/d2IL2N7WOsR.lVvf6tMeS7xOd2gVAU0JlJb3ax3u';
const JBIN_PROMO = process.env.JBIN_PROMO || '';

// Default promo codes
const DEFAULT_PROMOS = {
  'GOLFING1': {
    type:    'fixed',
    value:   7,
    minOrder: 50,
    expires: '2026-08-01',
    usedBy:  []
  }
};

function jsonbinRequest(method, binId, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${binId}${method === 'GET' ? '/latest' : ''}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JBIN_KEY,
        'X-Bin-Meta': 'false'
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(null); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
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
    const { code, contact, orderTotal } = req.body; // orderTotal includes balls + shipping
    const key = (code || '').toUpperCase().trim();

    // Load promos from JSONBin or use defaults
    let promos = DEFAULT_PROMOS;
    try {
      const data = await jsonbinRequest('GET', JBIN_PROMO);
      if (data && typeof data === 'object' && !Array.isArray(data)) promos = data;
    } catch(e) {}

    const promo = promos[key];
    if (!promo) return res.status(200).json({ valid: false, message: 'Invalid promo code.' });

    // Check expiry
    if (new Date() > new Date(promo.expires)) {
      return res.status(200).json({ valid: false, message: 'This promo code has expired.' });
    }

    // Check minimum order
    if (promo.minOrder && orderTotal < promo.minOrder) {
      return res.status(200).json({ valid: false, message: `This code requires a minimum order of $${promo.minOrder}.` });
    }

    // Check if already used
    const usedBy = promo.usedBy || [];
    if (contact && usedBy.includes(contact.toLowerCase())) {
      return res.status(200).json({ valid: false, message: 'You have already used this promo code.' });
    }

    // Calculate discount
    let discount = 0;
    let description = '';
    if (promo.type === 'fixed') {
      discount = promo.value;
      description = `$${promo.value} off`;
    } else if (promo.type === 'percent') {
      discount = Math.round((orderTotal * promo.value / 100) * 100) / 100;
      description = `${promo.value}% off`;
    } else if (promo.type === 'shipping') {
      discount = 0; // handled on frontend
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

  // ── REDEEM a promo code (mark as used) ──
  if (action === 'redeem' && req.method === 'POST') {
    const { code, contact } = req.body;
    const key = (code || '').toUpperCase().trim();

    let promos = DEFAULT_PROMOS;
    try {
      const data = await jsonbinRequest('GET', JBIN_PROMO);
      if (data && typeof data === 'object' && !Array.isArray(data)) promos = data;
    } catch(e) {}

    if (promos[key] && contact) {
      if (!promos[key].usedBy) promos[key].usedBy = [];
      promos[key].usedBy.push(contact.toLowerCase());
      try { await jsonbinRequest('PUT', JBIN_PROMO, promos); } catch(e) {}
    }

    return res.status(200).json({ success: true });
  }

  // ── GET all promos (for dashboard) ──
  if (action === 'get' && req.method === 'GET') {
    let promos = DEFAULT_PROMOS;
    try {
      const data = await jsonbinRequest('GET', JBIN_PROMO);
      if (data && typeof data === 'object' && !Array.isArray(data)) promos = data;
    } catch(e) {}
    return res.status(200).json(promos);
  }

  // ── SAVE promos (from dashboard) ──
  if (action === 'save' && req.method === 'POST') {
    const promos = req.body;
    try { await jsonbinRequest('PUT', JBIN_PROMO, promos); } catch(e) {}
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
};
