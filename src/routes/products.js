const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/products', async (req, res) => {
  const products = await prisma.product.findMany({ orderBy: { updatedAt: 'desc' } });
  res.render('products', { products, message: req.query.message || null });
});

router.get('/products/template.csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=template-produk.csv');
  res.send('sku,name,price,stock\nRING-001,Cincin Batu Bulan,150000,10\nNECK-002,Kalung Amethyst,250000,5\n');
});

router.post('/products/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/products?message=' + encodeURIComponent('Tidak ada file diupload.'));
    }

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    let success = 0;
    let failed = 0;

    for (const row of rows) {
      const sku = String(row.sku ?? row.SKU ?? row.Sku ?? '').trim();
      const name = String(row.name ?? row.nama ?? row.Nama ?? row.Name ?? '').trim();
      const priceRaw = row.price ?? row.harga ?? row.Harga ?? row.Price ?? '';
      const stockRaw = row.stock ?? row.stok ?? row.Stok ?? row.Stock ?? 0;

      const price = parseInt(String(priceRaw).replace(/[^0-9]/g, ''), 10);
      const stock = parseInt(String(stockRaw).replace(/[^0-9]/g, ''), 10) || 0;

      if (!sku || !name || Number.isNaN(price)) {
        failed++;
        continue;
      }

      await prisma.product.upsert({
        where: { sku },
        update: { name, price, stock },
        create: { sku, name, price, stock },
      });
      success++;
    }

    res.redirect(
      '/products?message=' +
        encodeURIComponent(`Selesai. Berhasil: ${success} produk. Gagal/dilewati: ${failed}.`)
    );
  } catch (err) {
    console.error(err);
    res.redirect('/products?message=' + encodeURIComponent('Error saat upload: ' + err.message));
  }
});

router.post('/products/add', async (req, res) => {
  try {
    const { sku, name, price, stock } = req.body;
    await prisma.product.upsert({
      where: { sku: sku.trim() },
      update: { name, price: parseInt(price, 10), stock: parseInt(stock || 0, 10) },
      create: { sku: sku.trim(), name, price: parseInt(price, 10), stock: parseInt(stock || 0, 10) },
    });
    res.redirect('/products?message=' + encodeURIComponent('Produk disimpan.'));
  } catch (err) {
    console.error(err);
    res.redirect('/products?message=' + encodeURIComponent('Error: ' + err.message));
  }
});

router.post('/products/:id/delete', async (req, res) => {
  await prisma.product.delete({ where: { id: parseInt(req.params.id, 10) } });
  res.redirect('/products?message=' + encodeURIComponent('Produk dihapus.'));
});

module.exports = router;
