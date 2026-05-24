const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart, shipping, customer } = req.body;

    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${item.ball} (${item.grade})`,
          description: `${item.qty} dozen · ${item.qty * 12} balls`,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Shipping — ${shipping.carrier}`,
          description: shipping.speed,
        },
        unit_amount: Math.round(shipping.cost * 100),
      },
      quantity: 1,
    });

    // Parse the address the customer already entered
    // Format is "123 Main St, Miami, FL 33101"
    const addressParts = customer.address.split(',').map(s => s.trim());
    const line1  = addressParts[0] || '';
    const city   = addressParts[1] || '';
    const stateZip = (addressParts[2] || '').trim().split(' ');
    const state  = stateZip[0] || '';
    const zip    = stateZip[1] || '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `https://backinplaygolfing.com/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://backinplaygolfing.com/checkout.html`,
      customer_email: customer.email || undefined,

      // Pre-fill shipping address from what customer already typed
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: undefined,

      // Pre-fill the customer's name and address
      customer_creation: 'always',
      payment_intent_data: {
        shipping: {
          name: customer.name,
          phone: customer.contact && !customer.contact.includes('@') ? customer.contact : undefined,
          address: {
            line1,
            city,
            state,
            postal_code: zip,
            country: 'US',
          },
        },
      },

      metadata: {
        customer_name:    customer.name,
        customer_contact: customer.contact,
        customer_address: customer.address,
        carrier:          shipping.carrier,
        notes:            customer.notes || '',
      },
      phone_number_collection: { enabled: true },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
};
