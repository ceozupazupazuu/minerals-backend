const express = require('express');
const PDFDocument = require('pdfkit');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/orders/:id/resi', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { items: true },
  });
  if (!order) return res.status(404).send('Order tidak ditemukan');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=resi-${order.orderNumber}.pdf`);

  // Ukuran label ~ 10cm x 15cm (283 x 425 pt)
  const doc = new PDFDocument({ size: [283, 425], margin: 16 });
  doc.pipe(res);

  const storeName = process.env.STORE_NAME || 'Minerals & Co. Jewelery';
  const storeAddress = process.env.STORE_ADDRESS || '';
  const storePhone = process.env.STORE_PHONE || '';

  doc.fontSize(11).font('Helvetica-Bold').text(storeName, { align: 'center' });
  if (storeAddress) doc.fontSize(8).font('Helvetica').text(storeAddress, { align: 'center' });
  if (storePhone) doc.fontSize(8).text(storePhone, { align: 'center' });

  doc.moveDown(0.6);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.6);

  doc.fontSize(9).font('Helvetica').text(`No. Order : ${order.orderNumber}`);
  doc.text(`Tanggal    : ${order.createdAt.toLocaleDateString('id-ID')}`);
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica-Bold').text('PENERIMA', { underline: true });
  doc.fontSize(10).font('Helvetica-Bold').text(order.customerName);
  doc.font('Helvetica').fontSize(9).text(order.phone);
  doc.text(order.address);
  doc.text(`${order.city || ''} ${order.postalCode || ''}`.trim());

  doc.moveDown(0.6);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.6);

  doc.fontSize(9).font('Helvetica-Bold').text('ISI PAKET');
  doc.font('Helvetica');
  order.items.forEach((it) => {
    doc.text(`${it.qty}x ${it.productName} (${it.sku})`);
  });

  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica-Bold').text(
    `Total: Rp ${order.totalAmount.toLocaleString('id-ID')}`,
    { align: 'right' }
  );

  if (order.notes) {
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica-Oblique').text(`Catatan: ${order.notes}`);
  }

  doc.end();
});

module.exports = router;
