import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// متغيرات البيئة
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const IFRAME_ID = process.env.PAYMOB_IFRAME_ID;

// 🏠 الصفحة الرئيسية
app.get("/", (req, res) => {
  res.json({ 
    status: "✅ Paymob Server Running Successfully",
    message: "مرحباً! سيرفر Paymob يعمل بنجاح",
    server_info: {
      name: "Paymob Payment Server",
      version: "1.0.0",
      uptime: Math.floor(process.uptime()) + " seconds",
      node_version: process.version,
      platform: process.platform
    },
    endpoints: {
      health: "/health - فحص حالة السيرفر",
      create_payment: "POST /paymob/create-payment - إنشاء عملية دفع",
      webhook: "POST /paymob/webhook - استقبال إشعارات الدفع"
    },
    environment_status: {
      api_key: !!PAYMOB_API_KEY ? "✅ متوفر" : "❌ مفقود",
      integration_id: !!INTEGRATION_ID ? "✅ متوفر" : "❌ مفقود", 
      iframe_id: !!IFRAME_ID ? "✅ متوفر" : "❌ مفقود"
    },
    test_payment_example: {
      description: "مثال لإنشاء عملية دفع",
      url: req.protocol + '://' + req.get('host') + '/paymob/create-payment',
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        amount: 100,
        email: "test@example.com",
        name: "أحمد محمد",
        phone: "01234567890",
        merchantOrderId: "TEST-001"
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 🏥 صحة السيرفر
app.get("/health", (_req, res) => res.send("ok"));

// باقي الكود كما هو...
app.post("/paymob/create-payment", async (req, res) => {
  try {
    const { amount, email, name, phone, merchantOrderId } = req.body;
    if (!amount) return res.status(400).json({ error: "amount مطلوب" });

    // 1- Auth Token
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY })
    });
    const authData = await authRes.json();
    if (!authData.token) return res.status(500).json({ error: "فشل في auth" });
    const token = authData.token;

    // 2- Order
    const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: "false",
        amount_cents: Math.round(Number(amount) * 100),
        currency: "EGP",
        merchant_order_id: merchantOrderId || `ORD-${Date.now()}`,
        items: []
      })
    });
    const orderData = await orderRes.json();
    if (!orderData.id) return res.status(500).json({ error: "فشل في إنشاء order" });

    // 3- Payment Key
    const paymentKeyRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: Math.round(Number(amount) * 100),
        expiration: 3600,
        order_id: orderData.id,
        currency: "EGP",
        integration_id: Number(INTEGRATION_ID),
        billing_data: {
          apartment: "NA",
          email: email || "user@example.com",
          floor: "NA",
          first_name: name || "User",
          street: "NA",
          building: "NA",
          phone_number: phone || "01000000000",
          shipping_method: "NA",
          postal_code: "NA",
          city: "Cairo",
          country: "EG",
          last_name: "NA",
          state: "NA"
        }
      })
    });
    const paymentKeyData = await paymentKeyRes.json();
    if (!paymentKeyData.token) return res.status(500).json({ error: "فشل في payment key" });

    const payment_token = paymentKeyData.token;
    const iframe_url = `https://accept.paymob.com/api/acceptance/iframes/${IFRAME_ID}?payment_token=${payment_token}`;

    res.json({
      ok: true,
      payment_token,
      iframe_url,
      order_id: orderData.id,
      merchant_order_id: merchantOrderId || null
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "خطأ غير متوقع" });
  }
});

app.post("/paymob/webhook", async (req, res) => {
  try {
    const payload = req.body;
    console.log("WEBHOOK:", JSON.stringify(payload));

    if (payload?.obj?.success === true && payload?.obj?.pending === false) {
      // TODO: حدّث اشتراك المستخدم في قاعدة بياناتك
    }

    res.status(200).send("received");
  } catch (e) {
    console.error(e);
    res.status(200).send("received");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on port", PORT));
