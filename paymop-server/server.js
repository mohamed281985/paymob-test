// تشغيل على Node 18+ (عنده fetch جاهز)
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// متغيرات البيئة
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;          // من Paymob Dashboard
const INTEGRATION_ID  = process.env.PAYMOB_INTEGRATION_ID;   // Integration ID لوسيلة الدفع (بطاقة مثلاً)
const IFRAME_ID       = process.env.PAYMOB_IFRAME_ID;        // رقم الـ Iframe من Paymob

// صحّة السيرفر
app.get("/health", (_req, res) => res.send("ok"));

// 1) إنشاء دفع جديد: ترجع payment_token + رابط الـ iframe
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
        },
        // تقدر تضيف lock_order_when_paid أو غيره حسب احتياجك
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

// 2) Webhook لإشعار الدفع الناجح/الفاشل (اختياري لكن مهم)
app.post("/paymob/webhook", async (req, res) => {
  try {
    // مبدئيًا: استقبل الجسم وسجّله. أنصحك تتحقق من HMAC حسب توثيق Paymob قبل اعتماد الحالة.
    const payload = req.body;
    console.log("WEBHOOK:", JSON.stringify(payload));

    // مثال بسيط للتحقق المنطقي (مش بديل عن HMAC):
    if (payload?.obj?.success === true && payload?.obj?.pending === false) {
      // TODO: حدّث اشتراك المستخدم في قاعدة بياناتك بناءً على merchant_order_id أو order.id
    }

    res.status(200).send("received");
  } catch (e) {
    console.error(e);
    res.status(200).send("received");
  }
});

// Render بيمرر PORT في env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on port", PORT));