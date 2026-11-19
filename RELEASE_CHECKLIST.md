# Customer handover and release checklist

Use this for each customer installation. Keep customer credentials in the customer's own accounts.

## Before accepting payment
- [ ] Agree the exact deliverables, exclusions, support period, hosting/domain ownership, and recurring costs in writing.
- [ ] Confirm the customer owns the Netlify, GitHub, domain, and Supabase accounts (or has documented admin access).
- [ ] Confirm this is a dedicated single-school installation, not a shared multi-school SaaS subscription.
- [ ] Demonstrate the public website and teacher dashboard using test data.
- [ ] Demonstrate quiz scoring, private homework upload/review, QR attendance, invoices, certificate printing, exports, and portal account linking with test accounts.
- [ ] Test PayHere sandbox checkout/webhook and each configured email/SMS/WhatsApp provider. Do not enable live payments until merchant approval and successful reconciliation.
- [ ] Confirm recorded email/SMS/WhatsApp consent before enabling scheduled fee reminders; test a reminder with a test invoice and confirm duplicate sends are prevented.
- [ ] Import the timetable `.ics` file into the customer's calendar app and confirm dates/times.

## Customer configuration
- [ ] Create a dedicated Supabase project in the customer's account.
- [ ] Run `supabase-schema.sql`, then `002_commercial_suite.sql`.
- [ ] Set the project URL and publishable/anon key in `config.js`. Never use a service-role/secret key in the browser.
- [ ] Create the teacher login, then promote that account using the SQL instructions in README.
- [ ] Connect the repository to the customer's Netlify account and set the production branch intentionally.
- [ ] Configure a custom domain, HTTPS, auth redirect URLs, email confirmation, SMTP, backups, and provider security settings.

## Acceptance tests
- [ ] Signed-out visitor can browse public pages and submit a registration request.
- [ ] Teacher can sign in, view/manage permitted records, and sign out.
- [ ] Student account cannot see teacher-only business modules or another student's private records.
- [ ] Parent access is tested only after an administrator securely creates the guardian/student link.
- [ ] Invalid input, empty states, network errors, and mobile layouts are checked.
- [ ] Supabase Security Advisor has been reviewed; all relevant RLS policies have been tested with separate accounts.
- [ ] No test credentials or real student/parent data are committed to GitHub.

## Handover
- [ ] Give the customer account ownership, domain/hosting details, setup guide, backup instructions, and support contact.
- [ ] Remove developer access unless ongoing support is part of the agreement.
- [ ] Record the deployed commit SHA and date.
