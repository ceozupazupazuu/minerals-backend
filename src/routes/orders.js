const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${datePart}-${rand}`;
}

// =====================================================
// PUBLIC ENDPOINT — dipanggil dari frontend minerals-co.id saat checkout
// POST /api/orders
// body: { customerName, phone, email, address, city, postalCode, notes,
//         items: [{ sku, qty }] }
// =====================================================
router.post('/api/orders', async (req, res) => {
  try {
    const { customerName, phone, email, address, city, postalCode, notes, items } = req.body;

    if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Data tidak lengkap (nama, telepon, alamat, items wajib diisi).' });
    }

    let total = 0;
    const orderItemsData = [];

    for (const it of items) {
      const product = await prisma.product.findUnique({ where: { sku: String(it.sku).trim() } });
      if (!product) {
        return res.status(400).json({ error: `SKU tidak ditemukan: ${it.sku}` });
      }
      const qty = parseInt(it.qty, 10) || 1;
      const subtotal = product.price * qty;
      total += subtotal;
      orderItemsData.push({
        sku: product.sku,
        productName: product.name,
        price: product.price,
        qty,
        subtotal,
      });
    }

    let orderNumber = generateOrderNumber();
    // pastikan unik
    // (kemungkinan tabrakan sangat kecil, tapi kita cek sekali)
    const exists = await prisma.order.findUnique({ where: { orderNumber } });
    if (exists) orderNumber = generateOrderNumber() + '-2';

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        phone,
        email: email || null,
        address,
        city: city || null,
        postalCode: postalCode || null,
        notes: notes || null,
        totalAmount: total,
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    res.json({ success: true, orderNumber: order.orderNumber, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan di server.' });
  }
});

// =====================================================
// ADMIN — butuh login
// =====================================================
router.use(requireAuth);

router.get('/orders', async (req, res) => {
  const status = req.query.status;
  const where = status ? { status } : {};
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
  res.render('orders', { orders, currentStatus: status || 'semua' });
});

router.get('/orders/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { items: true },
  });
  if (!order) return res.status(404).send('Order tidak ditemukan');
  res.render('order-detail', { order });
});

router.post('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  await prisma.order.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { status },
  });
  res.redirect(`/orders/${req.params.id}`);
});

module.exports = router;
