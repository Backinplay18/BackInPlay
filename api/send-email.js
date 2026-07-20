const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

function orderEmailHtml(order) {
  const itemRows = order.cart.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid rgba(201,169,97,0.15);color:#f4efe6;font-size:15px;">${item.ball}</td>
      <td style="padding:12px 0;border-bottom:1px solid rgba(201,169,97,0.15);color:rgba(244,239,230,0.6);font-size:14px;text-align:center;">${item.grade}</td>
      <td style="padding:12px 0;border-bottom:1px solid rgba(201,169,97,0.15);color:rgba(244,239,230,0.6);font-size:14px;text-align:center;">${item.qty} dz</td>
      <td style="padding:12px 0;border-bottom:1px solid rgba(201,169,97,0.15);color:#d4b87a;font-size:15px;text-align:right;font-weight:700;">$${(item.price * item.qty).toFixed(2)}</td>
    </tr>
  `).join('');

  const ballsTotal = order.cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const grandTotal = ballsTotal + order.shipCost;

  const deliveryDays = {
    'USPS Priority Mail': '2–3 business days',
    'USPS Ground Advantage': '3–5 business days',
    'UPS Ground': '3–5 business days',
    'FedEx Home Delivery': '2–4 business days',
  };
  const eta = deliveryDays[order.carrier] || '3–5 business days';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0d1f19;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1f19;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:#122922;border-radius:12px 12px 0 0;padding:32px 40px;border-bottom:2px solid #c9a961;">
          <table width="100%"><tr>
            <td>
              <div style="font-size:22px;font-weight:700;color:#d4b87a;letter-spacing:0.02em;">Back in Play LLC</div>
              <div style="font-size:12px;color:rgba(244,239,230,0.45);letter-spacing:0.15em;text-transform:uppercase;margin-top:4px;">Premium Used Golf Balls</div>
            </td>
            <td align="right">
              <div style="width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff9e8,#c9a961);display:inline-block;"></div>
            </td>
          </tr></table>
        </td></tr>

        <!-- HERO -->
        <tr><td style="background:#1a3a2e;padding:40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:16px;">⛳</div>
          <div style="font-size:28px;font-weight:700;color:#d4b87a;margin-bottom:8px;">Order Confirmed!</div>
          <div style="font-size:15px;color:rgba(244,239,230,0.7);line-height:1.6;">Thanks ${order.name}! Your balls are being packed and will ship soon.</div>
          <div style="margin-top:16px;display:inline-block;background:rgba(201,169,97,0.15);border:1px solid rgba(201,169,97,0.3);border-radius:100px;padding:6px 18px;font-size:12px;color:#c9a961;letter-spacing:0.1em;text-transform:uppercase;">Order ${order.id}</div>
        </td></tr>

        <!-- ORDER DETAILS -->
        <tr><td style="background:#122922;padding:32px 40px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c9a961;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(201,169,97,0.2);">Your Order</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <th style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(244,239,230,0.4);text-align:left;padding-bottom:8px;">Ball</th>
              <th style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(244,239,230,0.4);text-align:center;padding-bottom:8px;">Grade</th>
              <th style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(244,239,230,0.4);text-align:center;padding-bottom:8px;">Qty</th>
              <th style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(244,239,230,0.4);text-align:right;padding-bottom:8px;">Price</th>
            </tr>
            ${itemRows}
            <tr>
              <td colspan="3" style="padding:10px 0;color:rgba(244,239,230,0.5);font-size:14px;">Shipping (${order.carrier})</td>
              <td style="padding:10px 0;color:#d4b87a;font-size:14px;text-align:right;">$${order.shipCost.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding:16px 0 0;font-size:16px;font-weight:700;color:#f4efe6;border-top:1px solid rgba(201,169,97,0.2);">Total Charged</td>
              <td style="padding:16px 0 0;font-size:22px;font-weight:700;color:#d4b87a;text-align:right;border-top:1px solid rgba(201,169,97,0.2);">$${grandTotal.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- SHIPPING INFO -->
        <tr><td style="background:#0f2a1e;padding:32px 40px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c9a961;margin-bottom:16px;">Shipping Details</div>
          <table width="100%">
            <tr>
              <td width="50%" style="vertical-align:top;">
                <div style="font-size:11px;color:rgba(244,239,230,0.4);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Ship To</div>
                <div style="font-size:15px;color:#f4efe6;font-weight:600;">${order.name}</div>
                <div style="font-size:14px;color:rgba(244,239,230,0.6);margin-top:2px;">${order.address}</div>
              </td>
              <td width="50%" style="vertical-align:top;text-align:right;">
                <div style="font-size:11px;color:rgba(244,239,230,0.4);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Carrier</div>
                <div style="font-size:15px;color:#f4efe6;font-weight:600;">${order.carrier}</div>
                <div style="font-size:14px;color:rgba(244,239,230,0.6);margin-top:2px;">Est. ${eta}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- NOTES -->
        ${order.notes ? `
        <tr><td style="background:#122922;padding:20px 40px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c9a961;margin-bottom:8px;">Order Notes</div>
          <div style="font-size:14px;color:rgba(244,239,230,0.7);">${order.notes}</div>
        </td></tr>` : ''}

        <!-- FOOTER -->
        <tr><td style="background:#122922;border-radius:0 0 12px 12px;padding:32px 40px;border-top:1px solid rgba(201,169,97,0.15);text-align:center;">
          <div style="font-size:14px;color:rgba(244,239,230,0.6);line-height:1.7;margin-bottom:16px;">Questions? We're here to help.</div>
          <table align="center" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 12px;">
                <a href="tel:+17864563188" style="color:#d4b87a;text-decoration:none;font-size:14px;font-weight:600;">(786) 456-3188</a>
              </td>
              <td style="color:rgba(244,239,230,0.2);font-size:14px;">|</td>
              <td style="padding:0 12px;">
                <a href="mailto:backinplay18@gmail.com" style="color:#d4b87a;text-decoration:none;font-size:14px;font-weight:600;">backinplay18@gmail.com</a>
              </td>
            </tr>
          </table>
          <div style="margin-top:24px;font-size:12px;color:rgba(244,239,230,0.25);">© 2026 Back In Play LLC · Miami, FL · backinplaygolfing.com</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const order = req.body;
    const customerEmail = order.contact && order.contact.includes('@') ? order.contact : null;

    if (!customerEmail) {
      return res.status(200).json({ message: 'No email address — skipped' });
    }

    // Send to customer
    await resend.emails.send({
      from: 'Back In Play LLC <orders@backinplaygolfing.com>',
      to: customerEmail,
      subject: `Order Confirmed — ${order.id} ⛳`,
      html: orderEmailHtml(order),
    });

    // Send copy to you
    await resend.emails.send({
      from: 'Back In Play LLC <orders@backinplaygolfing.com>',
      to: 'backinplay18@gmail.com',
      subject: `🏌️ New Order — ${order.name} — $${(order.cart.reduce((s,i)=>s+(i.price*i.qty),0)+order.shipCost).toFixed(2)}`,
      html: orderEmailHtml(order),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
};
