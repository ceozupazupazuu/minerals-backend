require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const prisma = require('./db');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const resiRoutes = require('./routes/resi');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.set('trust proxy', 1); // Railway ada di belakang proxy

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || '*',
    methods: ['GET', 'POST'],
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ganti-secret-ini',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use('/', authRoutes);
app.use('/', productRoutes);
app.use('/', orderRoutes);
app.use('/', resiRoutes);

app.get('/', requireAuth, async (req, res) => {
  const [totalProducts, totalOrders, ordersBaru] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'baru' } }),
  ]);
  res.render('dashboard', { totalProducts, totalOrders, ordersBaru });
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Toko Panel 2 jalan di port ${PORT}`));
