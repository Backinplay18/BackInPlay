const https = require('https');

const JBIN_KEY = process.env.JBIN_KEY || '$2a$10$k7iiAvrIhQYE/d2IL2N7WOsR.lVvf6tMeS7xOd2gVAU0JlJb3ax3u';
const JBIN_INV = '6a11ccbfee5a733b12098982';
const JBIN_ORD = '6a11ccf86877513b27be5365';

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
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({}); }
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { type, action } = req.query;
    const binId = type === 'orders' ? JBIN_ORD : JBIN_INV;

    if (action === 'save') {
      const body = req.body;
      await jsonbinRequest('PUT', binId, body);
      return res.status(200).json({ success: true });
    } else {
      const data = await jsonbinRequest('GET', binId);
      return res.status(200).json(data);
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
