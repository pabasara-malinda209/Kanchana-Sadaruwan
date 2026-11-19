# Security and privacy notes

This repository is a single-institution deployment template. Deploy a separate Netlify site and a separate Supabase project for each teacher/customer. It is **not** a shared multi-tenant SaaS service.

## Non-negotiable rules
- Never commit Supabase `service_role` / secret keys, payment secrets, SMTP passwords, or student/parent exports.
- The browser may contain only the Supabase project URL and publishable/anon key. Database access must be enforced by RLS, not by hiding UI controls.
- Do not enter real student records until the customer-owned Supabase project has been configured and all checks below pass.
- Restrict Supabase project membership to trusted operators and enable MFA on the Supabase/GitHub accounts.
- Use HTTPS and a customer-controlled domain for the production site.
- Use private Storage buckets and short-lived signed URLs for private student files. Do not put private files in public buckets.
- Payment gateway secrets and notification provider credentials must live only in trusted server-side functions, never in `config.js` or browser JavaScript.

## Required pre-launch checks
1. Run both SQL files in order in a fresh Supabase project.
2. Run Supabase Security Advisor and resolve every relevant error/warning. Confirm RLS is enabled on every exposed table.
3. Test with separate teacher, admin, student, parent, and signed-out sessions. Verify teacher accounts cannot update `profiles.role` directly; promote administrators only through trusted SQL. Verify each role can read only its permitted records and cannot change another user's records.
4. Confirm public registration accepts valid input and rejects invalid input. Add rate limiting / bot protection before advertising publicly.
5. Confirm email confirmation, password reset, SMTP sender, redirect URLs, and allowed origins are configured.
6. Review the public site for real teacher identity, contact details, prices, venues, schedules, permissions for testimonials/photos, and privacy notice.
7. Test mobile layouts, all forms, empty/error states, and keyboard accessibility.
8. Back up the database and document the recovery owner/process.
9. Verify the deployed commit and preview before publishing to the production branch.

## Current scope boundary
The repository includes public pages, registration intake, teacher/admin CRUD, parent/student account linking, database-scored quizzes, private assignment uploads, QR attendance tokens, invoices, PayHere server functions, provider-backed email/SMS/WhatsApp functions, opt-in scheduled fee reminders, certificate printing, ID cards, calendar export, CSV exports and an audit view. These are implementation paths, not a certification of live service: configure provider accounts and secrets in Netlify, apply migrations, and complete the acceptance tests before selling them as operational.

## Incident response
If a key is exposed, rotate it immediately in the provider dashboard, remove it from Git history where appropriate, redeploy, and review access logs. If student/parent data is exposed, stop public access, preserve evidence, notify the responsible institution, and follow applicable privacy and legal obligations.
