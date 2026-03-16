# Custom Domain Setup Checklist

Follow these steps in order when switching to a custom domain (e.g. `pdfcheck.io`).

---

## 1. Update Environment Variables

In `.env.local` (local) and Vercel dashboard (production):

```
VITE_APP_URL=https://pdfcheck.io
```

All OG tags, canonical URLs, and structured data pull from this variable automatically.

---

## 2. Vercel — Add Custom Domain

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → your project → **Settings → Domains**
2. Click **Add Domain** → enter `pdfcheck.io`
3. Vercel gives you DNS records to configure:
   - **A record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
4. Add these at your DNS registrar (Namecheap, Cloudflare, GoDaddy, etc.)
5. Wait for propagation (usually 5–30 minutes with Cloudflare)
6. Vercel auto-provisions SSL certificate

---

## 3. Supabase — Add Redirect URL

OAuth and magic links redirect back to your app. You must whitelist the new domain.

1. Go to [supabase.com](https://supabase.com) → your project → **Authentication → URL Configuration**
2. **Site URL**: set to `https://pdfcheck.io`
3. **Redirect URLs**: add:
   - `https://pdfcheck.io/**`
   - `https://www.pdfcheck.io/**`
4. Save changes — takes effect immediately

---

## 4. Stripe — Update Webhook Endpoint

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers → Webhooks**
2. Edit the existing webhook endpoint
3. Change URL from `https://pdf-tool-website-review.vercel.app/...` to `https://pdfcheck.io/api/webhook`
4. Copy the new **Signing Secret** and update in Supabase secrets:
   ```
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## 5. Google OAuth — Add Authorized Redirect URI

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Select your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://yotqoouitaonibdtfztx.supabase.co/auth/v1/callback
   ```
   *(This is already the Supabase callback — no change needed if using Supabase Auth)*
4. Under **Authorized JavaScript origins**, add:
   - `https://pdfcheck.io`
   - `https://www.pdfcheck.io`
5. Save

---

## 6. Update Plausible Analytics Domain

In `index.html`, the Plausible script has `data-domain="pdf-tool-website-review.vercel.app"`.

Update to:
```html
<script defer data-domain="pdfcheck.io" src="https://plausible.io/js/script.js"></script>
```

Also add `pdfcheck.io` as a new site in your Plausible dashboard.

---

## 7. Supabase Edge Functions CORS

The edge functions allow all origins by default (`*`). If you want to restrict:

In `supabase/functions/_shared/cors.ts`, update:
```ts
"Access-Control-Allow-Origin": "https://pdfcheck.io"
```

---

## 8. Final Verification Checklist

- [ ] `https://pdfcheck.io` loads with valid SSL
- [ ] `https://www.pdfcheck.io` redirects to apex (configure in Vercel)
- [ ] Sign in / Sign up works (Supabase redirect URL correct)
- [ ] Google OAuth works (authorized origins updated)
- [ ] Stripe checkout opens and returns to correct URL
- [ ] OG image loads at `https://pdfcheck.io/og-image.png`
- [ ] Canonical tag in page source shows `https://pdfcheck.io/`
- [ ] Plausible dashboard shows traffic from new domain

---

## DNS Records Summary

| Type  | Name | Value                      |
|-------|------|----------------------------|
| A     | @    | 76.76.21.21                |
| CNAME | www  | cname.vercel-dns.com       |

