# D1 Picks Deployment Guide

## Step 1: Deploy to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select **beaubranton4/d1-picks** from the list
4. Configure the project:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `next build` (default)
5. Expand **"Environment Variables"** and add:
   - Name: `ODDS_API_KEY`
   - Value: *(your key from https://the-odds-api.com)*
6. Click **Deploy**
7. Wait ~1-2 minutes for build

---

## Step 2: Connect d1picks.com Domain

### In Vercel:
1. Go to your project dashboard
2. Click **Settings** → **Domains**
3. Enter `d1picks.com` and click **Add**
4. Vercel will show DNS records to configure

### In Your Domain Registrar:

Add these DNS records:

| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

**OR** use Vercel nameservers (simpler):
- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

Wait 5-30 minutes for DNS propagation.

---

## Step 3: Create OG Image (Optional but Recommended)

Create a 1200x630 PNG for social previews.

Save as: `public/og-image.png`

This appears when someone shares your link on Twitter/Facebook.

---

## Step 4: Set Up Email Capture (Buttondown)

1. Go to https://buttondown.email
2. Create a free account
3. Go to **Settings** → **Embedding**
4. Copy your newsletter slug
5. Update `src/components/EmailCapture.tsx` line 12:
   ```
   https://buttondown.com/api/emails/embed-subscribe/YOUR-SLUG
   ```
6. Commit and push the change

---

## Checklist

- [ ] Deploy to Vercel
- [ ] Add `ODDS_API_KEY` environment variable
- [ ] Add `d1picks.com` in Vercel Domains
- [ ] Configure DNS at registrar
- [ ] Wait for DNS propagation
- [ ] Test site at https://d1picks.com
- [ ] Create and add OG image
- [ ] Set up Buttondown email
- [ ] Test email signup works
- [ ] Test on mobile

---

## After Launch

- [ ] Post first picks on Twitter
- [ ] Share in r/collegebaseball (be helpful, not spammy)
- [ ] Track pick performance in a spreadsheet
- [ ] Iterate based on feedback

---

## Troubleshooting

**Build fails?**
- Check environment variable is set correctly
- Check Vercel build logs for errors

**Domain not working?**
- DNS can take up to 48 hours (usually 5-30 min)
- Verify DNS records are correct at https://dnschecker.org

**No picks showing?**
- Warren Nolan may not have data for that date
- Check if it's baseball season (Feb-June)
- Verify ODDS_API_KEY is valid
