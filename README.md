# Kanchana Sadaruwan Education Website

A responsive Sinhala/English/Tamil tuition website for Grades 1–11: Mathematics, Science and English.

## Included
- Public home page, subject and grade information, WhatsApp contact (076 402 1823)
- Student registration request form
- Email/password sign-in and student/teacher portal shell
- Teacher sections for registrations, students, timetable, attendance, exams, resources, notices, payments and income summaries
- Supabase database schema with Row Level Security (RLS) policies to protect parent phone numbers, student records, marks and payments

## IMPORTANT: one-time backend setup is still required
The GitHub repository cannot create a private Supabase project or securely configure your account credentials on your behalf. Until these steps are complete, login and registration data will not be live. Do not publish real student data before setup.

### 1. Create Supabase
1. Open https://supabase.com/ on your phone and create a project.
2. In the project, open **SQL Editor → New query**.
3. Copy all of `supabase-schema.sql` from this repository into the editor and run it.
4. Open **Project Settings → API** and copy the Project URL and the anon/public key (NOT the service_role/secret key).

### 2. Connect the website
1. Open `config.js` in GitHub and edit it.
2. Replace `https://YOUR-PROJECT.supabase.co` with your Project URL.
3. Replace `YOUR_SUPABASE_ANON_PUBLIC_KEY` with the anon/public key.
4. Save the file. Never put a service_role key in website code.

### 3. Create teacher account and enable admin
1. Open the website and use **Login → Create account** with the teacher's email and a strong password.
2. In Supabase **Authentication → Users**, confirm the teacher account exists.
3. In SQL Editor run this query, replacing the email:
   `update public.profiles set role='teacher' where id=(select id from auth.users where email='TEACHER_EMAIL_HERE');`
4. Sign out and sign in again. The teacher portal will show management sections.

### 4. Student accounts
Teacher creates student records in the protected database. To link a student login, create their Auth account, then set the matching `students.auth_user_id` and `profiles.student_id` in Supabase. Do not share teacher login details with students.

### 5. Parent portal setup
1. Ask the parent to create an account using the website login form.
2. In Supabase, promote that account to the `parent` role:
   `update public.profiles set role='parent' where id=(select id from auth.users where email='PARENT_EMAIL_HERE');`
3. In the teacher portal, use **Parent Links** to connect the parent's Auth user UUID to each child student's UUID. (These IDs are visible in Supabase Auth Users and the students table.)
4. Sign out and sign in again as the parent. The parent portal shows only linked children and their permitted attendance, results, and payment records.

### 6. Apply all commercial migrations
After `supabase-schema.sql`, run these files in order in Supabase SQL Editor:
1. `002_commercial_suite.sql`
2. `003_workflows_security.sql`
3. `004_payhere_payments.sql`
4. `005_homework_uploads.sql`
5. `006_notifications.sql`
6. `007_multi_admin.sql`

These migrations add teacher business modules, parent links, server-marked quizzes, invoices, short-lived QR attendance, private student file storage, assignment submissions, and payment transaction records. Apply them to a fresh test project first and review the SQL before production.

### 7. PayHere online payments (optional until merchant account is ready)
Deploy on Netlify and configure these **Netlify environment variables** (never add them to GitHub or `config.js`):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side Netlify functions only)
- `PAYHERE_MERCHANT_ID`
- `PAYHERE_MERCHANT_SECRET`
- `PAYHERE_MODE=sandbox` for testing; change to `live` only after merchant approval and successful sandbox tests
- `PUBLIC_SITE_URL` (your HTTPS website URL)
- Optional: `PAYHERE_RETURN_URL`, `PAYHERE_CANCEL_URL`, `PAYHERE_NOTIFY_URL`

The checkout function verifies the signed-in user and invoice access; the webhook verifies PayHere’s signature before marking the invoice paid. Use PayHere sandbox transactions and reconcile test callbacks before enabling live mode. Never expose the service-role key or merchant secret to browser code.

### 8. Notifications and additional administrators
For email notifications configure `RESEND_API_KEY` and `EMAIL_FROM` in Netlify. For SMS configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. For WhatsApp Cloud API configure `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. The teacher-only notification screen sends through the selected provider and stores a delivery log. Provider accounts, sender verification, consent, regional rules and message templates are the customer's responsibility. WhatsApp delivery is subject to Meta policy and opt-in.

To add another trusted administrator, create their account, verify identity, then run `update public.profiles set role='admin' where id=(select id from auth.users where email='ADMIN_EMAIL_HERE');`. Never let a public sign-up choose the admin role.

### 9. Deploy
Connect this GitHub repository to Netlify. Publish the repository root; Netlify detects functions under `netlify/functions`. Set the production branch intentionally and configure the environment variables above. Re-deploy after updating files.

## Notes / current limitations
- This repository contains the website UI and backend schema. The Supabase project, keys, teacher account promotion and hosting connection require the account owner to complete the steps above.
- File upload storage buckets and a full student invitation workflow are not provisioned automatically. For now, add resource links in the teacher portal; configure Supabase Storage before accepting private uploads.
- Verify teacher identity, class fees, schedule, and actual lesson materials before public launch.
- Never store API secrets, service_role keys, passwords, marks, or parent contact lists in public GitHub files.

## Commercial platform extension (branch: commercial-platform-suite)

This branch adds a commercial-suite public landing section and a first set of teacher-only management modules:
- CRM leads and follow-ups
- Batches and class sessions
- Staff and expenses
- Assignments and submissions
- Quiz and online lesson records
- Messages, events and testimonials
- Campaigns, coupons and referrals
- Certificates, parent/student links and website settings

### Apply the extension migration
After running `supabase-schema.sql`, run `002_commercial_suite.sql` in Supabase SQL Editor. Then deploy the updated repository branch. The new teacher modules appear in the portal when a teacher is signed in.

### Important implementation status
The extension provides database-backed teacher CRUD for the listed records and the public site sections. It does **not** yet implement every end-user workflow end-to-end: for example payment gateway checkout/webhooks, SMS/email/WhatsApp provider delivery, QR scanning, quiz-taking/auto-marking UI, file storage upload, parent self-service onboarding, calendar integrations, and production-grade PDF/Excel reporting still require dedicated implementation and provider credentials. Do not market these as active until completed and tested.

Use Supabase Storage buckets and signed URLs for private student files. Configure payment providers only through secure server-side functions; never put secret keys in browser code. Review all RLS policies with test student, parent and teacher accounts before accepting real student records.


## Selling and handing over this website

This codebase is currently a **dedicated single-teacher / single-institution website template**. For each customer, create a separate customer-owned GitHub repository (or transfer repository ownership), Netlify site, and Supabase project. Do not use one shared database for unrelated teachers: tenant isolation has not been implemented.

Before describing it as production-ready or accepting a final handover, complete [SECURITY.md](SECURITY.md) and [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). In particular, configure the customer's own Supabase project, test RLS with separate teacher/student/parent accounts, configure email/auth settings, and verify the production deployment.

The existing UI is not yet a complete all-in-one LMS/ERP. Payment gateway checkout and webhooks, automated SMS/email/WhatsApp delivery, quiz-taking and auto-marking, QR attendance, private file uploads, parent self-service onboarding, and automated certificate/report generation are not implemented end-to-end. Quote these as future phases, not delivered features. A real customer installation also needs the teacher's verified content, prices, timetable, contact information, domain, and privacy notice.


## Workflow capabilities added in this branch
- **Quizzes:** teachers create quiz and question records; learners see only published quizzes for their grade. Answer keys are returned only to server-side SQL functions, and scoring is calculated in the database.
- **QR attendance:** teacher generates a one-time token valid for ten minutes; students scan the QR with a camera or enter the token. A token can only be redeemed once.
- **Homework:** students upload private work to the `student-private` bucket; teachers can open short-lived signed links, mark work and give feedback. Parents can view linked-child submission status.
- **Invoices and payments:** teachers create invoices; learners/parents see only invoices allowed by RLS. PayHere checkout and webhook functions are included but require the merchant credentials and sandbox validation above.
- **Public updates:** published events and testimonials are loaded from Supabase into the public site.
- **Audit trail:** selected student, payment and attendance changes are logged; the teacher dashboard can read the log only if the corresponding module is implemented.

## Before you sell
This is still a customer-installable template, not a shared SaaS product. Every teacher/customer must have a separate Supabase project and Netlify site. The payment integration requires a PayHere merchant account; automated email/SMS/WhatsApp delivery still needs provider-specific configuration and a sending workflow. Run every migration in a disposable Supabase project and test teacher, student, parent and signed-out sessions before real data is used.