// Real-time shipping rates via EasyPost
const https = require('https');

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY || '';

function easypostRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(EASYPOST_API_KEY + ':').toString('base64');
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.easypost.com',
      path,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch(e) { resolve({}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { toZip, toState, toCity, totalDozens } = req.body;

    if (!toZip) return res.status(400).json({ error: 'ZIP code required' });

    // Weight: ~1.5 lbs per dozen, minimum 1 lb
    const weightOz = Math.max(16, Math.round((totalDozens || 1) * 1.5 * 16));

    // Box size based on quantity
    const parcel = (totalDozens || 1) > 2
      ? { length: 12, width: 8,  height: 6, weight: weightOz }
      : { length: 9,  width: 6,  height: 4, weight: weightOz };

    const shipment = await easypostRequest('/v2/shipments', 'POST', {
      shipment: {
        from_address: {
          name:    'Back In Play LLC',
          street1: '1000 N Ocean Dr',
          city:    'Hollywood',
          state:   'FL',
          zip:     '33019',
          country: 'US',
          phone:   '7864563188'
        },
        to_address: {
          name:    'Customer',
          city:    toCity  || '',
          state:   toState || '',
          zip:     toZip,
          country: 'US'
        },
        parcel
      }
    });

    if (!shipment.rates || shipment.rates.length === 0) {
      return res.status(200).json({ rates: [], error: 'No rates available for this address' });
    }

    const formatted = shipment.rates
      .filter(r => r.rate && parseFloat(r.rate) > 0)
      .map(r => ({
        id:          r.id,
        carrier:     r.carrier,
        service:     r.service,
        rate:        parseFloat(r.rate),
        displayName: formatServiceName(r.carrier, r.service),
        displayDays: r.delivery_days
          ? `${r.delivery_days} business day${r.delivery_days > 1 ? 's' : ''}`
          : 'Estimated 2–5 days'
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);

    return res.status(200).json({ rates: formatted, shipmentId: shipment.id });

  } catch (err) {
    console.error('EasyPost error:', err);
    return res.status(500).json({ error: err.message });
  }
};

function formatServiceName(carrier, service) {
  const map = {
    'USPS_GroundAdvantage':       'USPS Ground Advantage',
    'USPS_Priority':              'USPS Priority Mail',
    'USPS_First':                 'USPS First Class',
    'USPS_Express':               'USPS Priority Mail Express',
    'UPS_UPSGround':              'UPS Ground',
    'UPS_UPS2ndDayAir':           'UPS 2nd Day Air',
    'FedEx_FEDEX_GROUND':         'FedEx Ground',
    'FedEx_HOME_DELIVERY':        'FedEx Home Delivery',
    'FedEx_FEDEX_EXPRESS_SAVER':  'FedEx Express Saver',
  };
  return map[`${carrier}_${service}`] || `${carrier} ${service}`;
}
