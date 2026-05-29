# Premium E-Commerce Platform — PRD

**Version:** 1.0 · **Date:** May 2026 · **Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Goals & Objectives](#3-goals--objectives)
4. [Tech Stack Recommendations](#4-tech-stack-recommendations)
5. [System Architecture](#5-system-architecture)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Authentication — Gmail OAuth 2.0](#7-authentication--gmail-oauth-20)
8. [User Panel — Features](#8-user-panel--features)
9. [Admin Panel — Features](#9-admin-panel--features)
10. [Payment Gateway & QR System](#10-payment-gateway--qr-system)
11. [Database Design (High-Level)](#11-database-design-high-level)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Security Requirements](#13-security-requirements)
14. [Milestones & Timeline](#14-milestones--timeline)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Success Metrics (KPIs)](#16-success-metrics-kpis)

---

## 1. Executive Summary

This document defines the full product requirements for a **Premium E-Commerce Platform**. The platform consists of two distinct panels — a **User Panel** for shoppers and an **Admin Panel** for store management — unified under a single codebase.

Authentication is handled exclusively via **Google (Gmail) OAuth 2.0**. Payments support a standard payment gateway (Razorpay / Stripe) as well as a **QR-based payment system** for instant UPI/QR checkout. The goal is to deliver a polished, scalable, and secure shopping experience comparable to leading e-commerce platforms.

---

## 2. Project Overview

| Field | Details |
|---|---|
| **Project Name** | Premium E-Commerce Platform |
| **Document Type** | Product Requirements Document (PRD) |
| **Version** | 1.0 |
| **Date** | May 2026 |
| **Auth Method** | Gmail / Google OAuth 2.0 |
| **Panels** | User Panel + Admin Panel (fully separated) |
| **Payment Methods** | Payment Gateway (Razorpay/Stripe) + QR Code (UPI) |
| **Deployment Target** | Web (Responsive) + Mobile Web |

---

## 3. Goals & Objectives

### Primary Goals

- Build a premium, responsive e-commerce experience for end users
- Provide a comprehensive admin panel for complete store management
- Enable secure, one-click authentication via Gmail (no password required)
- Support multiple payment flows: card/netbanking gateway + QR/UPI payments
- Allow admins to monitor all user activity, orders, and analytics in real time

### Secondary Goals

- Scalable architecture capable of handling 100,000+ products and 10,000+ concurrent users
- SEO-friendly URLs and page structure
- WCAG 2.1 AA accessibility compliance
- GDPR-ready data handling and privacy controls

---

## 4. Tech Stack Recommendations

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | Next.js 14 (React) | SSR/SSG for SEO, fast performance, App Router |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid premium UI development |
| **Backend** | Node.js + Express / Next.js API Routes | Unified JS stack, easy deployment |
| **Database** | PostgreSQL (primary) + Redis (cache) | Relational integrity + fast sessions |
| **ORM** | Prisma | Type-safe DB queries, migrations |
| **Auth** | NextAuth.js with Google Provider | Gmail OAuth 2.0, session management |
| **File Storage** | AWS S3 / Cloudinary | Product images, invoices |
| **Payment GW** | Razorpay (India) or Stripe (Global) | Wide support, webhooks, dashboard |
| **QR Payments** | Razorpay QR / PhonePe API / UPI Deep Link | Instant QR-based checkout |
| **Deployment** | Vercel (frontend) + Railway/Render (backend) | Zero-config CI/CD |
| **Email** | Resend / SendGrid | Order confirmations, alerts |

---

## 5. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│   Next.js Frontend (CDN) — /user/* and /admin/* routes      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                         API LAYER                           │
│   REST API · Auth Middleware · RBAC · Rate Limiting         │
└──────┬──────────┬──────────┬──────────┬──────────┬──────────┘
       │          │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼───┐ ┌───▼────┐ ┌───▼──────┐
  │  Auth  │ │Product │ │Orders │ │Payment │ │Analytics │
  │Service │ │Service │ │Service│ │Service │ │ Service  │
  └────┬───┘ └───┬────┘ └───┬───┘ └───┬────┘ └───┬──────┘
       └─────────┴──────────┴─────────┴──────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                        DATA LAYER                           │
│         PostgreSQL (persistent) · Redis (cache/sessions)    │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                     │
│   Google OAuth · Razorpay/Stripe · UPI QR · Email · S3      │
└─────────────────────────────────────────────────────────────┘
```

### Panel Separation

Admin and User panels are separated at the routing level with independent middleware:

- **User Panel:** `/app/(user)/*` — accessible to any authenticated user
- **Admin Panel:** `/app/(admin)/*` — accessible only to users with `role = ADMIN` or `SUPER_ADMIN`
- Role assignment is managed server-side; client-side routing is protected by middleware checks

---

## 6. User Roles & Permissions

| Role | Access Level | Key Permissions |
|---|---|---|
| **Guest** | Public only | Browse products, view listings, no checkout |
| **Customer** | User Panel | Full shopping, orders, profile, wishlist, reviews |
| **Admin** | Admin Panel | Manage products, orders, view users, basic analytics |
| **Super Admin** | Full Admin Panel | All admin rights + manage other admins, system config |

---

## 7. Authentication — Gmail OAuth 2.0

### Auth Flow

1. User clicks **"Sign in with Google"** on the login page
2. Redirected to Google's OAuth 2.0 consent screen (via NextAuth.js)
3. On success, Google returns access token + profile (name, email, avatar)
4. NextAuth creates/updates a user record in the database; a JWT session is issued
5. User is redirected based on role — User Dashboard or Admin Panel

### Key Requirements

- No username/password system — Google is the sole auth provider
- Session expiry: **7 days** with auto-refresh
- New Gmail accounts auto-register as **Customer** role
- Admin role must be manually assigned by a Super Admin
- Suspended accounts cannot log in even with a valid Google session

---

## 8. User Panel — Features

### 8.1 Homepage & Discovery

- Hero banner with promotional sliders (managed from admin)
- Featured categories, new arrivals, best sellers, and deals sections
- Search bar with autocomplete, filters (price, category, rating, brand), and sort options
- Recently viewed products, personalized recommendations

### 8.2 Product Listing & Detail

- Grid/list view toggle for product listings
- Product cards with: image, name, price, discount %, rating stars, add-to-cart button
- Product detail page: image gallery with zoom, size/color variants, stock status, description, specifications tab
- Customer reviews & ratings section (verified purchase badge)
- Related products and "Frequently Bought Together" section

### 8.3 Cart & Wishlist

- Persistent cart (saved to DB, synced across devices)
- Quantity update, item removal, save-for-later from cart
- Wishlist: add/remove products, move to cart
- Cart summary with subtotal, discount, taxes, estimated shipping

### 8.4 Checkout Flow (5 Steps)

| Step | Action |
|---|---|
| **1 — Address** | Add/select delivery address (multiple saved addresses supported) |
| **2 — Delivery** | Select shipping method (standard, express, same-day) |
| **3 — Payment** | Choose Payment Gateway or QR Code/UPI |
| **4 — Review** | Order summary confirmation before final submission |
| **5 — Confirmation** | Order ID, estimated delivery date, email confirmation sent |

- Coupon/promo code field with real-time validation

### 8.5 My Orders

- Full order history with status: Processing → Shipped → Delivered → Cancelled / Returned
- Order detail page: itemized list, payment details, tracking info, invoice download (PDF)
- Cancel order (within cancellation window), request return/refund
- Write a review after delivery

### 8.6 User Profile

- Profile: name, email (from Google), phone, avatar (synced from Google)
- Manage saved addresses (add/edit/delete/set default)
- Notification preferences (email, browser push)
- Account activity log (login history, device info)
- Delete account (GDPR right-to-erasure compliance)

---

## 9. Admin Panel — Features

### 9.1 Dashboard Overview

- Real-time KPI cards: Total Revenue, Total Orders, New Users Today, Active Sessions
- Revenue chart (daily/weekly/monthly toggle), Orders trend chart
- Top-selling products widget, Low-stock alerts widget
- Recent orders table with quick status update
- Recent user registrations feed

### 9.2 User Management

- Full user list: name, email, avatar, registration date, role, status, order count, total spend
- Search, filter (by role, status, date range), export to CSV
- **User detail view:** full profile, order history, session log, activity timeline
- **Actions:** change role, suspend/unsuspend account, send email
- View login history and device/IP information per user

### 9.3 Product Management

- Add/Edit/Delete products: title, description, category, tags, SKU, price, discount %, stock
- Upload multiple images (drag & drop, reorder), primary image selection
- Product variants: size, color, material — each variant has its own price and stock
- Bulk import via CSV, bulk price/stock update
- Product visibility toggle (published / draft / archived)

### 9.4 Category & Inventory Management

- Create/edit nested categories (parent → sub-category, up to 3 levels)
- Inventory tracking: current stock, reserved (in carts), available
- Low-stock threshold settings with automated admin email alerts
- Stock adjustment logs with reason codes (received, damaged, manual correction)

### 9.5 Order Management

- Orders table: Order ID, user, items, amount, payment method, status, date
- Order detail view: full item list, shipping address, payment proof, timeline log
- Status update: Processing → Confirmed → Shipped (add tracking #) → Delivered
- Process full or partial refunds with reason capture
- Print/download invoice, packing slip, and shipping label

### 9.6 Analytics & Reports

- **Revenue reports:** by day/week/month/year, by product, by category, by payment method
- **User reports:** registrations, retention, geographic distribution, device breakdown
- **Order reports:** conversion rate, average order value, return rate, cancellation rate
- **Payment reports:** gateway vs QR split, failed payment analysis
- Export all reports to CSV or PDF

### 9.7 Promotions & Coupons

- Create discount coupons: percentage or flat amount, minimum order value, usage limit, expiry date
- Banner management: upload/schedule homepage banners and promotional sliders
- Flash sale tool: set discounted price + time window for any product

### 9.8 Settings & Configuration

- Store settings: name, logo, contact info, currency, timezone
- Shipping zones and rate configuration
- Tax rules by region/category
- Email template editor (order confirmations, shipping updates, promotions)
- Payment gateway API key management (stored encrypted)

---

## 10. Payment Gateway & QR System

### 10.1 Standard Payment Gateway

- **Integration:** Razorpay (India) or Stripe (international)
- **Supported methods:** Credit/Debit card, Net banking, UPI (app-based), Wallets (Paytm, PhonePe, etc.)
- Hosted checkout iframe embedded in checkout flow
- Webhook listener for payment success, failure, and refund events
- Auto-update order status on webhook receipt
- PCI DSS compliance: no raw card data touches the server

### 10.2 QR Code Payment System

```
User selects "Pay via QR / UPI"
        ↓
System generates dynamic QR code (exact order amount)
        ↓
QR displayed on screen — 10-minute countdown timer
        ↓
User scans with any UPI app (GPay, PhonePe, Paytm, BHIM…)
        ↓
Backend polls payment status every 3 seconds
        ↓
  ┌─────┴─────┐
Success      Timeout
  ↓              ↓
Order placed  QR expires →
Email sent    Retry / switch method
```

### 10.3 Refund Flow

1. Admin initiates refund from order detail page
2. System calls payment gateway refund API with original transaction ID
3. Refund confirmation stored in DB; user notified by email
4. Refund timeline tracked in order activity log

---

## 11. Database Design (High-Level)

| Table | Key Fields |
|---|---|
| `users` | id, google_id, email, name, avatar_url, phone, role, status, created_at |
| `addresses` | id, user_id (FK), label, line1, line2, city, state, pincode, is_default |
| `products` | id, title, slug, description, price, discount_pct, stock, category_id, status |
| `product_images` | id, product_id (FK), url, order, is_primary |
| `product_variants` | id, product_id (FK), name, value, extra_price, stock |
| `categories` | id, name, slug, parent_id (self FK), image_url, order |
| `orders` | id, user_id (FK), address_id (FK), status, subtotal, discount, tax, shipping, total |
| `order_items` | id, order_id (FK), product_id (FK), variant_id (FK), qty, unit_price, total_price |
| `payments` | id, order_id (FK), method, gateway_txn_id, qr_ref, amount, status, paid_at |
| `coupons` | id, code, type, value, min_order, usage_limit, used_count, expires_at, is_active |
| `reviews` | id, user_id (FK), product_id (FK), rating, comment, is_verified, created_at |
| `activity_logs` | id, user_id (FK), action, metadata (JSON), ip, device, created_at |

---

## 12. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Page load < 2s (LCP), API response < 200ms (p95), checkout < 3s end-to-end |
| **Availability** | 99.9% uptime SLA; zero-downtime deployments via rolling updates |
| **Scalability** | Horizontal scaling; handle 10,000 concurrent users; 1M+ product catalog |
| **Responsiveness** | Fully responsive: mobile (320px), tablet (768px), desktop (1280px+) |
| **SEO** | Server-side rendered pages; sitemap.xml; schema.org markup |
| **Accessibility** | WCAG 2.1 AA — keyboard navigation, screen reader support, contrast ratios |
| **Internationalization** | Multi-currency display (INR default); i18n-ready string architecture |
| **Data Retention** | Orders: 7 years; logs: 1 year; deleted user data: 30-day grace period |

---

## 13. Security Requirements

- **OAuth 2.0 only** — no passwords stored; eliminates credential stuffing attacks
- HTTPS enforced everywhere; HSTS headers; `secure` & `httpOnly` cookies for sessions
- Admin routes protected by server-side middleware with role validation on every request
- Rate limiting on all API endpoints (100 req/min per IP for public, 1000 for authenticated)
- Input validation and sanitization on all user inputs (SQL injection, XSS prevention)
- Payment API keys encrypted at rest (AES-256); never exposed to frontend
- CSP (Content Security Policy) headers to prevent script injection
- Automated dependency vulnerability scanning (npm audit / Dependabot) in CI pipeline
- All admin actions logged with user ID, timestamp, and IP
- Two-step confirmation for destructive admin actions (bulk delete, refunds > ₹10,000)

---

## 14. Milestones & Timeline

| Phase | Milestone | Duration | Deliverable |
|---|---|---|---|
| **Phase 1** | Project Setup & Auth | 1 week | Repo, CI/CD, DB schema, Gmail OAuth working |
| **Phase 2** | User Panel — Core | 3 weeks | Homepage, product listing, product detail, cart |
| **Phase 3** | User Panel — Checkout | 2 weeks | Checkout flow, address management, order confirmation |
| **Phase 4** | Payment Integration | 2 weeks | Gateway (Razorpay/Stripe) + QR payment system |
| **Phase 5** | Admin Panel — Core | 3 weeks | Dashboard, user management, product management, order management |
| **Phase 6** | Admin Panel — Advanced | 2 weeks | Analytics, reports, promotions, settings |
| **Phase 7** | Testing & QA | 2 weeks | Unit tests, E2E (Playwright), load testing, UAT |
| **Phase 8** | Launch & Monitoring | 1 week | Production deploy, monitoring setup, go-live |

> **Total Estimated Duration: ~16 weeks (4 months)**

---

## 15. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Payment gateway downtime | Low | High | Fallback to secondary gateway; QR as backup |
| Google OAuth changes/deprecation | Very Low | High | Monitor Google API changelog; abstract auth layer |
| Scope creep delaying launch | Medium | Medium | Strict phase-based delivery; change request process |
| Performance at scale | Medium | High | Load testing in Phase 7; CDN + Redis caching |
| Security breach | Low | Very High | Pen testing, dependency scanning, WAF on production |
| User data privacy (GDPR/IT Act) | Low | High | Privacy policy, data deletion flows, DPA compliance |

---

## 16. Success Metrics (KPIs)

| KPI | Target (3 months post-launch) |
|---|---|
| User Registration Rate | > 500 new users/month via Gmail sign-in |
| Cart-to-Order Conversion | > 3.5% (industry average: 2–4%) |
| Payment Success Rate | > 97% (gateway) / > 90% (QR scans) |
| Average Page Load (LCP) | < 2.0 seconds on mobile 4G |
| Admin Panel Adoption | 100% of orders managed via admin panel |
| Support Tickets (payment) | < 0.5% of total transactions |
| Return/Refund Rate | < 8% of total orders |
| System Uptime | ≥ 99.9% monthly |

---

*This PRD is a living document. Updates should be versioned and communicated to all stakeholders before implementation begins.*
