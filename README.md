# 🏠 ServiCasa — Backend

Home services marketplace for Latin America. Built with Node.js + Express.

---

## Quick Start (Local)

```bash
npm install
node server.js
```

Open http://localhost:3000 — frontend + API both run on the same port.

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, get JWT token |

### Contractors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contractors | List all (filter: city, trade, sort) |
| GET | /api/contractors/:id | Get single contractor + reviews |
| POST | /api/contractors | Register as contractor (auth required) |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/jobs | Post a job (no auth needed) |
| GET | /api/jobs | List open jobs (auth required) |
| GET | /api/jobs/:id | Get job + bids |

### Bids
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/jobs/:id/bids | Submit bid (auth required) |
| PATCH | /api/bids/:id/accept | Accept a bid |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/contractors/:id/reviews | Leave a review |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stats | Platform statistics |
| GET | /api/health | Health check |

---

## Example API Calls

### Register a user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Carlos López","email":"carlos@email.com","password":"123456","role":"client"}'
```

### Post a job
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Pintura",
    "description": "Necesito pintar sala y comedor, 40m²",
    "city": "Bogotá",
    "neighborhood": "Chapinero",
    "clientName": "Carlos López",
    "clientPhone": "+57 310 1234567",
    "urgency": "Esta semana"
  }'
```

### Get contractors filtered
```bash
curl "http://localhost:3000/api/contractors?city=Bogotá&sort=rating"
```

---

## Deploy to Production (Free)

### Option 1: Railway.app (Easiest — $0/month)
1. Push this folder to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add env variable: JWT_SECRET=your-random-secret
4. Done — Railway gives you a live URL in 2 minutes

### Option 2: Render.com (Free tier)
1. Push to GitHub
2. render.com → New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add JWT_SECRET env var

### Option 3: VPS (DigitalOcean $6/mo)
```bash
# On your server:
git clone your-repo
cd servicasa
npm install
# Install PM2 to keep it running
npm install -g pm2
pm2 start server.js --name servicasa
pm2 save
```

---

## Upgrade to Real Database (Supabase)

The current server uses in-memory storage — data resets when server restarts.
To make data permanent:

1. Create free account at supabase.com
2. Create new project
3. Go to SQL Editor → paste contents of `supabase_schema.sql` → Run
4. Get your database URL from Project Settings → Database
5. Install pg: `npm install pg`
6. Replace the `db` object in server.js with real Postgres queries

---

## Add WhatsApp Notifications (Twilio)

When a job is posted, automatically notify matching contractors:

```bash
npm install twilio
```

```javascript
// In server.js, after creating a job:
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

for (const contractor of matched) {
  await twilio.messages.create({
    from: 'whatsapp:' + process.env.TWILIO_PHONE,
    to: 'whatsapp:' + contractor.phone,
    body: `🏠 Nuevo trabajo en ${job.city}: ${job.category}\n"${job.description.slice(0,100)}..."\nVer en ServiCasa`
  });
}
```

---

## Revenue Model

- **Commission**: Take 10-12% of each completed transaction
- **Featured listings**: Contractors pay $20-50k COP/month to appear at top
- **Verification badge**: One-time fee for background check + badge
- **Subscription**: $50-150k COP/month for premium contractor access

---

## Tech Stack

| Layer | Tech | Cost |
|-------|------|------|
| Backend | Node.js + Express | Free |
| Database | Supabase (PostgreSQL) | Free tier |
| Hosting | Railway / Render | Free tier |
| Frontend | Vanilla HTML/CSS/JS | Free |
| Payments | Mercado Pago | 3.49% per tx |
| SMS/WhatsApp | Twilio | ~$0.05/msg |
| Domain | Namecheap | ~$12/year |

**Total year 1: ~$12-50**
