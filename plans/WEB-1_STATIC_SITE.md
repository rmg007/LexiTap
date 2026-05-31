---
title: WEB-1 — Static Site + B2B Contact Form
status: ready
decision: D6 (manual B2B invoice model, no self-serve portal)
updated: 2026-05-31
---

# WEB-1 — Static Site + B2B Contact Form

**Phase:** P5 (Launch)  
**Effort:** M (~1–2 days)  
**Dependencies:** LEGAL-2 (privacy + ToS), LEGAL-1 (age gate copy if needed)  
**Blocks:** REVIEW-1 (store review notes must cite the site), SUBMIT-2 (iOS submission)

---

## Scope

Add a B2B contact form to the existing `lexitap.app` static site (currently marketing + legal). The form:
- Collects school name, contact email, learner count, and use case
- Routes submissions to a monitored inbox (`support@lexitap.app`)
- Triggers manual Supabase seat provisioning (deferred to fast-follow)

**Out of scope:**
- Self-serve web portal or pricing calculator (risk: Apple 3.1.1)
- B2C checkout or product listing (risk: App Review 3.1.1)
- Payment processing or PCI compliance

---

## Background: Why Manual, Not Self-Serve

**D6 decision:** App Review Guideline 3.1.1 prohibits in-app or on-site checkout for digital goods **without Apple IAP**. A self-serve portal on lexitap.app that (a) displays pricing, (b) collects credit-card details, or (c) activates licenses would trigger review scrutiny.

**Manual model advantages:**
- Zero PCI compliance burden (no card data on our servers)
- No tax/VAT collection complexity
- Faster deployment (weeks → days)
- Lower legal risk — "contact sales" signals B2B institutional buyer, not consumer ecommerce
- Easy to audit per school (email receipt = record)

**Fast-follow path (Phase 6):**
- Seat activation via **invite tokens** (email sent per school)
- Settings redemption field in-app (verbatim per APP_STORE_DISTRIBUTION_STRATEGY:83)
- Tokens validated by Supabase Edge Function (server-authoritative)
- No on-site enrollment

---

## Implementation

### 1. Contact form HTML (website/public/contact-sales.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contact Sales — LexiTap</title>
  <meta name="description" content="Bring LexiTap to your classroom. Contact us for institutional licensing and volume discounts." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  <script>(function(){try{var t=localStorage.getItem("lexitap-theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/">Lexi<span class="dot">Tap</span></a>
      <nav class="nav" aria-label="Primary">
        <a href="/privacy.html">Privacy</a>
        <a href="/terms.html">Terms</a>
        <button class="theme-toggle" type="button" aria-label="Switch theme">☀</button>
      </nav>
    </div>
  </header>

  <main id="main">
    <section class="hero">
      <div class="wrap">
        <h1>Bring LexiTap to Your School</h1>
        <p class="lede">Institutional licensing for ESL programs. Volume discounts. No setup fees.</p>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <h2>Get in Touch</h2>
        <form
          id="contact-form"
          method="POST"
          action="https://formspree.io/f/YOUR_FORM_ID"
          class="contact-form"
        >
          <fieldset>
            <legend>School Information</legend>
            <div class="field">
              <label for="school-name">School Name *</label>
              <input
                type="text"
                id="school-name"
                name="school_name"
                required
                aria-required="true"
              />
            </div>
            <div class="field">
              <label for="contact-email">Contact Email *</label>
              <input
                type="email"
                id="contact-email"
                name="contact_email"
                required
                aria-required="true"
              />
            </div>
            <div class="field">
              <label for="contact-name">Your Name *</label>
              <input
                type="text"
                id="contact-name"
                name="contact_name"
                required
                aria-required="true"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Program Details</legend>
            <div class="field">
              <label for="learner-count">Estimated Learners *</label>
              <select id="learner-count" name="learner_count" required aria-required="true">
                <option value="">Select...</option>
                <option value="10-50">10–50</option>
                <option value="51-100">51–100</option>
                <option value="101-500">101–500</option>
                <option value="500+">500+</option>
              </select>
            </div>
            <div class="field">
              <label for="use-case">Primary Use Case *</label>
              <select id="use-case" name="use_case" required aria-required="true">
                <option value="">Select...</option>
                <option value="toefl-prep">TOEFL Prep</option>
                <option value="ielts-prep">IELTS Prep</option>
                <option value="general-esl">General ESL</option>
                <option value="business-english">Business English</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="field">
              <label for="message">Additional Notes</label>
              <textarea
                id="message"
                name="message"
                rows="5"
                placeholder="Tell us about your program and timeline..."
              ></textarea>
            </div>
          </fieldset>

          <button type="submit" class="btn-primary">Submit</button>
          <p class="form-note">
            We'll review your submission and reach out within 2 business days.
          </p>
        </form>
      </div>
    </section>

    <section class="section section-alt">
      <div class="wrap">
        <h2>What Happens Next</h2>
        <div class="grid">
          <article class="card">
            <h3>1. Review</h3>
            <p>We'll review your school's profile and program size to prepare a custom quote.</p>
          </article>
          <article class="card">
            <h3>2. Quote</h3>
            <p>You'll receive a per-seat pricing proposal and activation timeline via email.</p>
          </article>
          <article class="card">
            <h3>3. Activate</h3>
            <p>Students receive invite codes to redeem in-app. No additional setup required.</p>
          </article>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="wrap">
      <span>© 2026 LexiTap</span>
      <nav class="links" aria-label="Footer">
        <a href="/privacy.html">Privacy</a>
        <a href="/terms.html">Terms</a>
        <a href="mailto:support@lexitap.app">support@lexitap.app</a>
      </nav>
    </div>
  </footer>

  <script src="/theme-toggle.js" defer></script>
</body>
</html>
```

### 2. CSS additions (website/public/styles.css)

Add to the stylesheet:

```css
.contact-form {
  max-width: 600px;
  margin: 2rem auto;
}

.contact-form fieldset {
  border: none;
  padding: 0 0 2rem 0;
  margin: 0;
}

.contact-form legend {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: block;
}

.contact-form .field {
  margin-bottom: 1.5rem;
}

.contact-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.95rem;
}

.contact-form input,
.contact-form select,
.contact-form textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  font: inherit;
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.contact-form input:focus,
.contact-form select:focus,
.contact-form textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.1);
}

.contact-form textarea {
  resize: vertical;
  min-height: 120px;
}

.contact-form button[type="submit"] {
  margin-top: 1rem;
}

.form-note {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
```

### 3. Add navigation link (website/public/index.html)

In the `<nav>` or near the hero badges, add:

```html
<a href="/contact-sales.html" class="btn-secondary">For Schools</a>
```

Or in the existing footer, add a "Contact sales" link.

### 4. Form backend: Formspree integration

Use [Formspree.io](https://formspree.io) (free tier covers institutional forms):

1. Create a Formspree account
2. Create a new form with email → `support@lexitap.app`
3. Replace `YOUR_FORM_ID` in the form's `action` attribute with your Formspree ID
4. Formspree will send all submissions to `support@lexitap.app`

**Alternative:** use Cloudflare Pages Functions to forward to email via SendGrid or similar (slightly more control, more setup).

---

## B2B Licensing Flow (Manual)

```
1. School fills contact form on lexitap.app/contact-sales.html
   ↓
2. Form submission → Formspree → email to support@lexitap.app
   ↓
3. Ryan receives email, reviews school profile + learner count
   ↓
4. Manual invoice generated (external tool, e.g. Wave or similar)
   ↓
5. Email sent with:
   - Per-seat pricing
   - Invoice
   - Next steps (payment method, invoice due date)
   ↓
6. After payment, Ryan manually creates Supabase seat records
   (Fast-follow: auto-generate invite tokens via Edge Function)
   ↓
7. Invite email sent to school with codes
   ↓
8. Students redeem codes in Settings (B2B1, Phase 3+)
```

---

## Constraints

- **No App Review risk.** The site does NOT display pricing, payment methods, or redirect to checkout. It collects contact info only. This is safe per 3.1.1.
- **No PCI.** Form submission is to Formspree (third-party email forwarder), not to our servers. We never touch card data.
- **No self-serve activation.** Users cannot self-provision seats. All activation is manual + auditable.
- **Privacy alignment.** Form privacy statement links to lexitap.app privacy policy (no separate DPA required; form data is stored in Formspree as email-in-transit).

---

## Testing

- [ ] Form loads + responds to input (desktop + mobile)
- [ ] Submit → Formspree delivers email to `support@lexitap.app`
- [ ] Theme toggle works on /contact-sales.html
- [ ] Links to /privacy.html, /terms.html work
- [ ] Accessibility: form labels + required attributes + keyboard nav work
- [ ] No hardcoded pricing or "buy now" language on the site

---

## Rollout

1. **Before beta:** Have contact form live (even if you manually provision seats)
2. **In beta notes (D1):** Include a link to the sales page if recruiting schools
3. **At P5 submission:** Include URL in App Review notes (REVIEW-1 context)

---

## Fast-Follow: B2B Seat Activation (Phase 3+, B2B1)

Not in scope for WEB-1. When shipped:

1. Supabase seat tables + invite tokens
2. Edge Function to validate redemption codes
3. Settings "Redeem institutional code" field (in-app)
4. Post-launch: automated invite-email generation + tracking

---

**Done when:**
- ✅ `/contact-sales.html` deployed to Cloudflare Pages
- ✅ Form submits to Formspree without errors
- ✅ Emails arrive at `support@lexitap.app`
- ✅ Page is styled consistently with lexitap.app
- ✅ No pricing/checkout language on the site
