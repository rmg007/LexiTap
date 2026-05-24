# Website and Teacher Referral System

---
title: Website and Teacher Referral System
category: marketing
status: active
phase: 1
priority: P0
updated: 2026-05-22
load_order: 12
tags: [website, teacher, referral, commission, supabase, promo-codes, dashboard, paywall, iap, api-endpoints]
---

> Load order: 12 of 14. Load when working on the website, teacher referral system, or paywall/IAP integration.

# Website and Teacher Referral Tool

---

## Part 1: Website ([lexicon-esl.com](http://lexicon-esl.com))

### Site Structure

**Single-page HTML**

- Hero → Problem → Solution → Pricing → Teachers → Footer
- One file: `index.html`
- No framework, no backend
- Deploy: Vercel/Netlify (free tier)

### Hero Section

```
Master English Vocabulary
Without Typing

Learn 10,000+ words for TOEFL, IELTS, and daily life.
Tap, drag, match—no keyboard frustration.
Offline. Private. Effective.

[Download on App Store]  [Get it on Google Play]

↓ Watch how it works (15sec video)
```

### Pricing Section

**Free Forever:**

- Foundation Level (CEFR A2-B1): 800 words
- Advanced Level (CEFR B2-C1): 1,200 words

**Unlock Test Prep:**

- TOEFL Vocabulary: $14.99
- IELTS Vocabulary: $14.99
- Business English: $9.99
- Common 3,000: $2.99
- Premium Pass: $29.99/year (all paid content)

### Teacher Section

```
Teach English? Earn with Lexicon

Help students master vocabulary.
Get paid when they succeed.

How it works:
1. Sign up for free
2. Share your unique code
3. Earn commission on purchases

Example: 50 students buy TOEFL → You earn $200+

[Become a Teacher Partner →]
```

### Assets Needed

**Screenshots (6):**

1. Home screen (daily goal, streak)
2. Quiz screen (multiple choice)
3. Progress screen (words mastered)
4. Paywall (TOEFL pricing)
5. Drag-drop assessment
6. Results celebration

**Demo video (15sec):**

- Screen recording of quiz flow
- Start → answer 3 questions → complete
- No voiceover needed

**Logo:**

- Text: "LexiTap"
- Icon: Speech bubble with tap gesture finger
- Color: Teal (#20B2AA)

### Deployment

```bash
mkdir lexitap-website
cd lexitap-website
touch index.html
npx vercel
# Done. Live at lexitap.vercel.app
# Add domain: lexitap.app ($20/year)
```

**Cost:** $20/year (domain only)

---

## Part 2: Teacher Referral Tool (Supabase)

### System Architecture

```
Teacher Signup
    ↓
Supabase Backend
    ↓
Generate Referral Code
    ↓
Teacher Dashboard
    ↓
Student Uses Code
    ↓
Commission Tracked
```

### Database Tables

**teachers:**

- id, name, email, referral_code
- total_referrals, total_earnings
- current_tier (1-4)
- paypal_email

**referrals:**

- teacher_id, product_id, product_price
- student_discount, student_paid
- teacher_commission_rate, teacher_commission
- purchased_at, receipt_id

**tier_thresholds:**

- tier, min_referrals, commission_rate, name
- Tier 1: 0-10 refs, 20%
- Tier 2: 11-50 refs, 25%
- Tier 3: 51-200 refs, 30%
- Tier 4: 201+ refs, 35%

**promo_codes:**

- code, type ("free_module" or "free_premium")
- free_product_id, uses_remaining
- expires_at, is_active

### Teacher Flow

**1. Signup (`/teachers/signup`):**

```
Create Your Account

Name: [____________]
Email: [____________]
Country: [____________]

[Create Account →]
```

**2. Success Page:**

```
✅ Account Created!

Your referral code: TEACHER_MARIA

Share with students:
"Download Lexicon ESL and use code 
TEACHER_MARIA for 20% off test prep!"

[Copy Message] [WhatsApp] [Email]

Track earnings: lexicon-esl.com/track?code=TEACHER_MARIA
```

**3. Dashboard (`/teachers/track`):**

```
Teacher Dashboard

Code: TEACHER_MARIA

Total Earnings: $48.00
Total Referrals: 12 students
Current Tier: Bronze (25% commission)
Next Payout: June 1, 2026

Progress to Silver Tier:
[████████░░░░] 45/51 referrals

Recent Activity:
┌──────────┬────────────┬──────────┬──────────┐
│ Date     │ Purchase   │ Price    │ You Earn │
├──────────┼────────────┼──────────┼──────────┤
│ May 20   │ TOEFL      │ $14.99   │ $3.75    │
│ May 18   │ IELTS      │ $14.99   │ $3.75    │
└──────────┴────────────┴──────────┴──────────┘
```

### API Endpoints (Supabase Edge Functions)

**1. Validate Teacher Code**

```tsx
POST /api/validate-teacher-code
{"code": "TEACHER_MARIA"}

// Response:
{
  "valid": true,
  "discount": 0.20,
  "teacher_name": "Maria",
  "tier": 2,
  "commission_rate": 0.25
}
```

**2. Validate Promo Code**

```tsx
POST /api/validate-promo-code
{"code": "PLUMBER2025"}

// Response:
{
  "valid": true,
  "type": "free_module",
  "free_product_id": "toefl"
}
```

**3. Record Purchase**

```tsx
POST /api/record-purchase
{
  "teacher_code": "TEACHER_MARIA",
  "product_id": "toefl",
  "product_price": 14.99,
  "student_paid": 11.992,
  "receipt_id": "apple_xyz"
}

// Response:
{
  "success": true,
  "teacher_commission": 3.75,
  "teacher_new_tier": 2
}
```

### Commission Tiers (Gamification)

**Tier 1 - Starter (0-10 referrals):**

- Commission: 20%
- Example: TOEFL $14.99 → Teacher earns $3.00

**Tier 2 - Bronze (11-50 referrals):**

- Commission: 25%
- Example: TOEFL $14.99 → Teacher earns $3.75
- Unlock: After 11th referral

**Tier 3 - Silver (51-200 referrals):**

- Commission: 30%
- Example: TOEFL $14.99 → Teacher earns $4.50
- Unlock: After 51st referral

**Tier 4 - Gold (201+ referrals):**

- Commission: 35%
- Example: TOEFL $14.99 → Teacher earns $5.25
- Unlock: After 201st referral

**Incentive:** Teachers compete to reach next tier

### Marketing Materials for Teachers

**1. WhatsApp message:**

```
📚 Learn English vocabulary the smart way!

Download Lexicon ESL (free app)
✓ 2,000+ free words
✓ TOEFL, IELTS, Business English
✓ No typing needed
✓ Works offline

Use code TEACHER_MARIA for 20% off!

iOS: [link]
Android: [link]
```

**2. Classroom poster (PDF):**

```jsx
┌─────────────────────────────────────┐
│   MASTER VOCABULARY WITHOUT TYPING  │
│                                     │
│   [QR code to App Store]            │
│                                     │
│   Download LexiTap              │
│   Use code: TEACHER_MARIA           │
│   Get 20% off test prep             │
│                                     │
│   Free: 2,000+ words                │
│   Paid: Test prep from $9.99        │
└─────────────────────────────────────┘
```

**3. Email template:**

```jsx
Subject: Improve your English vocabulary

Hi [Student],

I recommend LexiTap for building vocabulary.

No typing needed—just tap and drag.
2,000+ words free, test prep $9.99-$14.99.

Use code TEACHER_MARIA for 20% off.

Download: lexitap.app

Let me know if you have questions!

[Your name]
```

### Admin Panel (Promo Codes)

**URL:** `/admin` (password-protected)

**Features:**

- Create new promo codes
- Set type (free_module or free_premium)
- Set uses (1 = single-use, NULL = unlimited)
- Set expiration date
- View active codes
- Deactivate codes

**Use cases:**

- Give plumber free TOEFL module: `PLUMBER2025`
- Give friend free Premium Pass: `FRIEND_JOHN`
- Promotional campaign: `LAUNCH50` (50 uses)

---

## Mobile App Integration

### Paywall Screen

```
TOEFL Vocabulary
600 words + audio

$14.99 → $11.99 (with teacher code)

Have a teacher code?
[Enter code: ____________] [Apply]

Have a promo code?
[Enter code: ____________] [Apply]

[Purchase for $11.99]
```

**Flow:**

1. User enters teacher code
2. App validates via Supabase API
3. If valid: Apply 20% discount
4. User purchases via Apple/Google IAP
5. App records purchase in Supabase
6. Teacher earns commission (auto-calculated by tier)

**Promo code flow:**

1. User enters promo code
2. App validates via Supabase API
3. If "free_module": Unlock product, no IAP
4. If "free_premium": Unlock all, no IAP
5. Record redemption in Supabase

---

## Payout System

**Month 1-3 (Manual):**

- Export Supabase CSV monthly
- Send PayPal to teachers earning $20+
- Effort: 30min/month

**Month 4+ (Automated):**

- PayPal Mass Payments API
- Or Stripe Connect
- Or Wise API (international)

**Don't automate until 20+ teachers earning.**

---

## Timeline

**Week 1: Website**

- Day 1-2: Design + copywriting
- Day 3: Build HTML
- Day 4: Deploy
- **Deliverable:** Live at [lexicon-esl.com](http://lexicon-esl.com)

**Week 2: Teacher Tool**

- Day 1: Supabase setup + schema
- Day 2: Edge Functions (3 endpoints)
- Day 3: Teacher signup page
- Day 4: Teacher dashboard
- Day 5: Admin panel
- **Deliverable:** Fully functional teacher system

**Week 3: Mobile Integration**

- Day 1-2: Add codes to paywall
- Day 3: Integrate Supabase
- Day 4: Test end-to-end
- **Deliverable:** Working referral system

---

## Cost Summary

- Domain: $12/year
- Hosting: $0 (Vercel free tier)
- Supabase: $0 (free tier: 500MB DB)
- **Total: $12/year**