// Inventory + Orders via Supabase (replaces JSONBin)
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { type, action } = req.query;
    const key = type === 'orders' ? 'orders' : 'inventory';

    if (action === 'save') {
      // UPSERT into store table
      await supabaseRequest('POST', '/rest/v1/store', {
        key,
        value: req.body,
        updated_at: new Date().toISOString()
      });
      return res.status(200).json({ success: true });
    } else {
      // GET from store table
      const rows = await supabaseRequest('GET', `/rest/v1/store?key=eq.${key}&select=value`, null);
      if (Array.isArray(rows) && rows.length > 0) {
        return res.status(200).json(rows[0].value);
      }
      // Return empty defaults if not seeded yet
      return res.status(200).json(key === 'orders' ? [] : {});
    }
  } catch(e) {
    console.error('Supabase sync error:', e);
    return res.status(500).json({ error: e.message });
  }
};
