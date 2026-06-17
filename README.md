# RetailFlow — White Label Retail Management System

> Kirana bhi. Pharmacy bhi. Supermarket bhi. — Build once. Toggle. Deploy.

## 🚀 Quick Start

### Backend
```bash
cd retailflow-backend
npm install
# Edit .env with your MongoDB, Redis, Cloudinary credentials
npm run dev     # → http://localhost:5000
```

### Frontend
```bash
cd retailflow-frontend
npm install
npm run dev     # → http://localhost:3000
```

## 🏷️ White Label Delivery (30 minutes)
1. Copy `retailflow-backend/.env.example` → `.env`
2. Set: `SHOP_NAME`, `SHOP_LOGO`, `BRAND_COLOR`
3. Toggle features: `UDHAAR_SYSTEM=true`, `GST_BILLING=true`, `PHARMACY_MODE=true` etc.
4. `npm run build` → deploy `frontend/dist/` to Vercel/Netlify
5. Deploy backend to client VPS/Railway/Render

## 🎯 Client Questionnaire → .env Mapping
| Question | .env Key |
|----------|---------|
| Shop type? | GROCERY_MODE / PHARMACY_MODE / GENERAL_RETAIL_MODE |
| Branches? | MULTI_BRANCH=true |
| Barcode scanner? | BARCODE_SCANNER=true, ADVANCED_POS=true |
| Home delivery? | HOME_DELIVERY=true, ONLINE_ORDERING=true |
| Udhaar system? | UDHAAR_SYSTEM=true |
| GST registered? | GST_BILLING=true |
| Loyalty program? | LOYALTY_PROGRAM=true |

## 📦 Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS + Zustand + TanStack Query |
| Backend | Node.js + Express + MongoDB Atlas + Upstash Redis |
| Payments | Razorpay + Stripe + UPI |
| Notifications | Twilio WhatsApp/SMS + Nodemailer |
| Files | Cloudinary + PDFKit + ExcelJS |
| Realtime | Socket.io |

## 🏗️ Architecture
- **18 MongoDB collections**
- **Role-based access**: Owner → Manager → Cashier → Stockboy → Delivery
- **Feature toggles** via `.env` — zero code change per client
- **JWT** 15min + Refresh 7 days
- **Cron jobs**: Expiry alerts, Low stock alerts, Udhaar reminders, Daily report

## 📁 Structure
```
retailflow/
├── retailflow-backend/     # Express API
└── retailflow-frontend/    # React SPA
```

## 🛡️ Security
- bcrypt rounds: 12
- Rate limiting: 100 req/min
- Helmet.js headers
- Joi validation on every route
- CORS configured
- Sensitive ops require Manager auth (void sale, price override)
