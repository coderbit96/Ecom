# Launch Checklist

## Environment

- Generate `AUTH_SECRET` and `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
- Set production values from `.env.production.example` in Vercel.
- Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the production domain.
- Add production Google OAuth authorized origin: `https://yourdomain.com`.
- Add production Google OAuth redirect URI: `https://yourdomain.com/api/auth/callback/google`.
- Add Razorpay webhook URL: `https://yourdomain.com/api/payments/webhook`.

## Deployment

- Connect the GitHub repository to Vercel.
- Add all environment variables in the Vercel dashboard.
- Run Prisma deployment for the production database before switching live traffic.
- Attach the custom domain and confirm HTTPS.

## Monitoring

- Set `SENTRY_DSN`, `SENTRY_ORG`, and `SENTRY_PROJECT` to enable Sentry.
- Vercel Analytics is mounted in the root layout.
- Configure Better Uptime or UptimeRobot with a 1 minute alert threshold.
- Before live Razorpay mode, test card, UPI, and QR checkout in test mode.

## Final Verification

- Full checkout creates an order and clears cart.
- Razorpay verification confirms order and payment.
- Admin dashboard and charts load with production data.
- Order confirmation email provider is configured before enabling emails.
