const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'servicasa-secret-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────
// IN-MEMORY DATABASE (replace with Supabase/Postgres in production)
// ─────────────────────────────────────────
const db = {
  users: [],
  contractors: [
    {
      id: 'c1', userId: null,
      name: 'Mario Restrepo', initials: 'MR', trade: 'Pintura',
      city: 'Bogotá', rating: 4.9, reviewCount: 47, jobCount: 127,
      yearsExp: 5, ratePerHour: 85000, available: true,
      bio: 'Pintor profesional con más de 5 años de experiencia en interiores y exteriores.',
      badges: ['Verificado', 'Top Rated'], phone: '+57 310 0000001',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c2', userId: null,
      name: 'Sofía Vargas', initials: 'SV', trade: 'Limpieza Profunda',
      city: 'Medellín', rating: 4.8, reviewCount: 62, jobCount: 203,
      yearsExp: 4, ratePerHour: 65000, available: true,
      bio: 'Especialista en limpieza de hogares y oficinas con métodos ecológicos.',
      badges: ['Verificada', 'Disponible Hoy'], phone: '+57 310 0000002',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c3', userId: null,
      name: 'Juan Ospina', initials: 'JO', trade: 'Carpintería',
      city: 'Bogotá', rating: 4.7, reviewCount: 31, jobCount: 88,
      yearsExp: 7, ratePerHour: 95000, available: true,
      bio: 'Carpintero con 7 años fabricando muebles a medida, closets y cocinas.',
      badges: ['Verificado'], phone: '+57 310 0000003',
      createdAt: new Date().toISOString()
    },
    {
      id: 'c4', userId: null,
      name: 'Camila Ríos', initials: 'CR', trade: 'Drywall & Reparaciones',
      city: 'Cali', rating: 4.9, reviewCount: 28, jobCount: 54,
      yearsExp: 3, ratePerHour: 75000, available: true,
      bio: 'Técnica en drywall y reparaciones generales. Trabajo limpio y a tiempo.',
      badges: ['Verificada'], phone: '+57 310 0000004',
      createdAt: new Date().toISOString()
    }
  ],
  jobs: [],
  bids: [],
  reviews: [
    { id: 'r1', contractorId: 'c1', clientName: 'Ana García', rating: 5, text: 'Excelente trabajo, muy puntual y profesional. Lo recomiendo ampliamente.', createdAt: new Date(Date.now() - 14*24*60*60*1000).toISOString() },
    { id: 'r2', contractorId: 'c1', clientName: 'Carlos Mendoza', rating: 5, text: 'El mejor pintor que he contratado. Terminó antes del plazo.', createdAt: new Date(Date.now() - 30*24*60*60*1000).toISOString() },
    { id: 'r3', contractorId: 'c2', clientName: 'Laura Jiménez', rating: 5, text: 'Limpieza impecable y muy respetuosa con mis cosas.', createdAt: new Date(Date.now() - 7*24*60*60*1000).toISOString() },
    { id: 'r4', contractorId: 'c3', clientName: 'Pedro Salcedo', rating: 4, text: 'Muebles de excelente calidad. Tardó un día más de lo previsto.', createdAt: new Date(Date.now() - 21*24*60*60*1000).toISOString() },
  ]
};

// ─────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ─────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Campos requeridos: name, email, password' });
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email ya registrado' });

  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), name, email, password: hashed, phone, role: role || 'client', createdAt: new Date().toISOString() };
  db.users.push(user);

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// ─────────────────────────────────────────
// CONTRACTOR ROUTES
// ─────────────────────────────────────────

// GET /api/contractors — list all, with optional filters
app.get('/api/contractors', (req, res) => {
  let list = [...db.contractors];
  const { city, trade, available, sort } = req.query;

  if (city) list = list.filter(c => c.city.toLowerCase().includes(city.toLowerCase()));
  if (trade) list = list.filter(c => c.trade.toLowerCase().includes(trade.toLowerCase()));
  if (available === 'true') list = list.filter(c => c.available);

  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  else if (sort === 'price_asc') list.sort((a, b) => a.ratePerHour - b.ratePerHour);
  else if (sort === 'price_desc') list.sort((a, b) => b.ratePerHour - a.ratePerHour);
  else if (sort === 'jobs') list.sort((a, b) => b.jobCount - a.jobCount);

  res.json({ contractors: list, total: list.length });
});

// GET /api/contractors/:id
app.get('/api/contractors/:id', (req, res) => {
  const contractor = db.contractors.find(c => c.id === req.params.id);
  if (!contractor) return res.status(404).json({ error: 'Técnico no encontrado' });

  const reviews = db.reviews.filter(r => r.contractorId === req.params.id);
  res.json({ ...contractor, reviews });
});

// POST /api/contractors — register as contractor (requires auth)
app.post('/api/contractors', authMiddleware, (req, res) => {
  const { trade, city, ratePerHour, yearsExp, bio, phone } = req.body;
  if (!trade || !city) return res.status(400).json({ error: 'trade y city son requeridos' });

  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const existing = db.contractors.find(c => c.userId === req.user.id);
  if (existing) return res.status(409).json({ error: 'Ya tienes un perfil de técnico' });

  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const contractor = {
    id: uuidv4(), userId: req.user.id,
    name: user.name, initials, trade, city,
    rating: 0, reviewCount: 0, jobCount: 0,
    yearsExp: yearsExp || 0, ratePerHour: ratePerHour || 0,
    available: true, bio: bio || '', badges: ['Nuevo'],
    phone: phone || user.phone, createdAt: new Date().toISOString()
  };
  db.contractors.push(contractor);
  res.status(201).json(contractor);
});

// ─────────────────────────────────────────
// JOB ROUTES
// ─────────────────────────────────────────

// POST /api/jobs — post a new job
app.post('/api/jobs', (req, res) => {
  const { title, description, category, city, neighborhood, clientName, clientPhone, budget, urgency } = req.body;
  if (!description || !category || !city || !clientName || !clientPhone) {
    return res.status(400).json({ error: 'Campos requeridos: description, category, city, clientName, clientPhone' });
  }

  const job = {
    id: uuidv4(),
    title: title || category,
    description, category, city, neighborhood,
    clientName, clientPhone,
    budget: budget || null,
    urgency: urgency || 'Esta semana',
    status: 'open',
    bidCount: 0,
    createdAt: new Date().toISOString()
  };
  db.jobs.push(job);

  // Auto-notify matching contractors (in production: send WhatsApp/SMS via Twilio)
  const matched = db.contractors.filter(c =>
    c.city.toLowerCase() === city.toLowerCase() &&
    c.available &&
    (c.trade.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(c.trade.toLowerCase()))
  );

  res.status(201).json({
    job,
    matchedContractors: matched.length,
    message: `Tu trabajo fue enviado a ${matched.length} técnico(s) verificado(s) en ${city}.`
  });
});

// GET /api/jobs — list open jobs (contractors use this)
app.get('/api/jobs', authMiddleware, (req, res) => {
  let jobs = [...db.jobs];
  const { city, category, status } = req.query;

  if (city) jobs = jobs.filter(j => j.city.toLowerCase().includes(city.toLowerCase()));
  if (category) jobs = jobs.filter(j => j.category.toLowerCase().includes(category.toLowerCase()));
  if (status) jobs = jobs.filter(j => j.status === status);
  else jobs = jobs.filter(j => j.status === 'open');

  jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ jobs, total: jobs.length });
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', (req, res) => {
  const job = db.jobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
  const bids = db.bids.filter(b => b.jobId === req.params.id);
  res.json({ ...job, bids });
});

// ─────────────────────────────────────────
// BIDS ROUTES
// ─────────────────────────────────────────

// POST /api/jobs/:id/bids — contractor submits a bid
app.post('/api/jobs/:jobId/bids', authMiddleware, (req, res) => {
  const { amount, message, estimatedDays } = req.body;
  const job = db.jobs.find(j => j.id === req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Trabajo no encontrado' });
  if (job.status !== 'open') return res.status(400).json({ error: 'Este trabajo ya no está disponible' });

  const contractor = db.contractors.find(c => c.userId === req.user.id);
  if (!contractor) return res.status(403).json({ error: 'Solo técnicos pueden cotizar' });

  const existing = db.bids.find(b => b.jobId === req.params.jobId && b.contractorId === contractor.id);
  if (existing) return res.status(409).json({ error: 'Ya enviaste una cotización para este trabajo' });

  const bid = {
    id: uuidv4(),
    jobId: req.params.jobId,
    contractorId: contractor.id,
    contractorName: contractor.name,
    amount, message,
    estimatedDays: estimatedDays || 1,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.bids.push(bid);
  job.bidCount = (job.bidCount || 0) + 1;

  res.status(201).json({ bid, message: 'Cotización enviada exitosamente' });
});

// PATCH /api/bids/:id/accept — client accepts a bid
app.patch('/api/bids/:bidId/accept', (req, res) => {
  const bid = db.bids.find(b => b.id === req.params.bidId);
  if (!bid) return res.status(404).json({ error: 'Cotización no encontrada' });

  bid.status = 'accepted';
  const job = db.jobs.find(j => j.id === bid.jobId);
  if (job) job.status = 'in_progress';

  // Reject all other bids for this job
  db.bids.filter(b => b.jobId === bid.jobId && b.id !== bid.id).forEach(b => b.status = 'rejected');

  const contractor = db.contractors.find(c => c.id === bid.contractorId);
  res.json({ bid, contractor, message: '¡Técnico contratado! Te contactará pronto.' });
});

// ─────────────────────────────────────────
// REVIEWS ROUTES
// ─────────────────────────────────────────

// POST /api/contractors/:id/reviews
app.post('/api/contractors/:contractorId/reviews', (req, res) => {
  const { clientName, rating, text } = req.body;
  if (!clientName || !rating || !text) return res.status(400).json({ error: 'clientName, rating y text son requeridos' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating debe ser entre 1 y 5' });

  const contractor = db.contractors.find(c => c.id === req.params.contractorId);
  if (!contractor) return res.status(404).json({ error: 'Técnico no encontrado' });

  const review = {
    id: uuidv4(),
    contractorId: req.params.contractorId,
    clientName, rating: Number(rating), text,
    createdAt: new Date().toISOString()
  };
  db.reviews.push(review);

  // Recalculate contractor rating
  const contractorReviews = db.reviews.filter(r => r.contractorId === req.params.contractorId);
  contractor.rating = Math.round((contractorReviews.reduce((s, r) => s + r.rating, 0) / contractorReviews.length) * 10) / 10;
  contractor.reviewCount = contractorReviews.length;

  res.status(201).json({ review, newRating: contractor.rating });
});

// ─────────────────────────────────────────
// STATS ROUTE (admin dashboard)
// ─────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const openJobs = db.jobs.filter(j => j.status === 'open').length;
  const completedJobs = db.jobs.filter(j => j.status === 'completed').length;
  const activeContractors = db.contractors.filter(c => c.available).length;
  const totalBids = db.bids.length;
  const avgRating = db.contractors.length
    ? Math.round((db.contractors.reduce((s, c) => s + c.rating, 0) / db.contractors.length) * 10) / 10
    : 0;

  const cityCounts = db.jobs.reduce((acc, j) => {
    acc[j.city] = (acc[j.city] || 0) + 1;
    return acc;
  }, {});

  const categoryCounts = db.jobs.reduce((acc, j) => {
    acc[j.category] = (acc[j.category] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalUsers: db.users.length,
    totalContractors: db.contractors.length,
    activeContractors,
    totalJobs: db.jobs.length,
    openJobs,
    completedJobs,
    totalBids,
    avgRating,
    cityCounts,
    categoryCounts
  });
});

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Serve frontend for any unmatched route
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏠 ServiCasa API running on http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET    /api/health`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/contractors?city=Bogotá&trade=Pintura&sort=rating`);
  console.log(`   GET    /api/contractors/:id`);
  console.log(`   POST   /api/contractors`);
  console.log(`   POST   /api/jobs`);
  console.log(`   GET    /api/jobs (auth required)`);
  console.log(`   POST   /api/jobs/:id/bids (auth required)`);
  console.log(`   PATCH  /api/bids/:id/accept`);
  console.log(`   POST   /api/contractors/:id/reviews`);
  console.log(`   GET    /api/stats\n`);
});
