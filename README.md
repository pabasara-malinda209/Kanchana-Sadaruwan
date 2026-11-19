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
5. In **Authentication → URL Configuration**, add the customer's HTTPS Netlify URL and custom domain as allowed redirect URLs. Configure email confirmation and a verified SMTP sender before inviting students or parents.

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
Teacher creates student records in the protected database. Ask the student to create an account, then use **Link Portal Accounts** in the teacher portal to link the student's email to the student record. Do not share teacher login details with students.

### 5. Parent and student portal setup
1. Ask the parent/student to create an account using the website login form and confirm the email if enabled.
2. Sign in as teacher/admin and open **Link Portal Accounts**.
3. Choose Student or Parent, enter the exact sign-up email, select the matching student record, and link it. Parents can be linked to multiple children by repeating the process.
4. Ask the user to sign out and back in. Their portal menu and data access will reflect the linked role.
The account-linking database function checks teacher/admin permission and performs the role/link update atomically; no service-role key is needed in browser code.

### 6. Apply all commercial migrations
After `supabase-schema.sql`, run these files in order in Supabase SQL Editor:
1. `002_commercial_suite.sql`
2. `003_workflows_security.sql`
3. `004_payhere_payments.sql`
4. `005_homework_uploads.sql`
5. `006_notifications.sql`
6. `007_multi_admin.sql`
7. `008_certificate_access.sql`
8. `009_portal_account_linking.sql`
9. `010_payhere_atomic_webhook.sql`
10. `011_scheduled_reminders.sql`
11. `012_profile_privilege_hardening.sql`

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

The checkout function verifies the signed-in user and invoice access; the webhook verifies PayHere’s signature and applies payment changes atomically. Active orders expire after 30 minutes to reduce duplicate charges. Use PayHere sandbox transactions and reconcile test callbacks before enabling live mode. Never expose the service-role key or merchant secret to browser code.

### 8. Notifications and additional administrators
Configure provider credentials in Netlify only:
- Email: `RESEND_API_KEY`, `EMAIL_FROM`.
- SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
- WhatsApp Cloud API: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
- Optional manual WhatsApp approved template: `WHATSAPP_MESSAGE_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`. Without a template, free-form WhatsApp messages are subject to Meta's customer-service window.
- Scheduled WhatsApp fee reminders: `WHATSAPP_REMINDER_TEMPLATE_NAME` and `WHATSAPP_TEMPLATE_LANGUAGE`. The approved template must have four body placeholders in this order: invoice number, student name, amount, due date.

For scheduled fee reminders, add parent email/phone details and record the consent source, then tick only the matching opt-in boxes on the student record. The reminder function runs at 03:00 UTC (08:30 Sri Lanka time) on published Netlify deploys; it does not run on Deploy Previews. Provider accounts, sender verification, consent, regional rules and approved message templates are the customer's responsibility.

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

### Implementation status and external requirements
This branch now includes working code paths for the core flows: teacher CRUD, parent/student account linking, published learner quizzes with server-side scoring, private homework uploads and marking, short-lived QR attendance tokens, invoices, PayHere checkout/webhook handlers, provider-backed email/SMS/WhatsApp sending, certificate printing, CSV export, audit screens and a PWA shell.

These workflows are **not yet production-certified**. They require the listed SQL migrations, correct RLS policies, a customer-owned Supabase project, Netlify functions and environment variables, provider merchant/sender accounts, sandbox testing and real-device acceptance tests. PayHere payments cannot run without an approved merchant account. Notifications cannot be delivered until Resend/Twilio/WhatsApp Cloud credentials and sender/consent requirements are configured. Browser print-to-PDF is used for certificates; there is no server-generated PDF service. Calendar sync, automated recurring reminders, advanced analytics, and full multi-school SaaS tenant isolation are not included.

Do not claim any external integration is live until the customer's own credentials are configured and a test delivery/payment is verified. Never put service-role keys or provider secrets in browser code.

## Workflow capabilities added in this branch
- **Quizzes:** teachers create quiz and question records; learners see only published quizzes for their grade. Answer keys are returned only to server-side SQL functions, and scoring is calculated in the database.
- **QR attendance:** teacher generates a one-time token valid for ten minutes; students scan the QR with a camera or enter the token. A token can only be redeemed once.
- **Homework:** students upload private work to the `student-private` bucket; teachers can open short-lived signed links, mark work and give feedback. Parents can view linked-child submission status.
- **Invoices and payments:** teachers create invoices; learners/parents see only invoices allowed by RLS. PayHere checkout and webhook functions are included but require the merchant credentials and sandbox validation above.
- **Public updates:** published events and testimonials are loaded from Supabase into the public site.
- **Certificates:** teachers issue and print certificates; students and linked parents can view and print them (browser print-to-PDF).
- **Student ID cards:** teachers, students and linked parents can print student ID cards from linked student records.
- **Calendar export:** learners, parents and teachers can download the class timetable as an `.ics` file for Google/Apple/Outlook calendar import.
- **Fee reminders:** a daily Netlify scheduled function sends reminders one day before unpaid invoices, only through channels explicitly opted into on the student record.
- **Financial reporting:** dashboard totals recorded income and expenses and calculates net cash.
- **PWA:** installable application manifest and a cached static app shell for quicker repeat loads. Authenticated workflows still require an internet connection.
- **Legal templates:** editable privacy notice and terms pages; customer must replace placeholders and obtain suitable legal review before collecting real student data.
- **Exports:** teacher business-suite tables can be exported as CSV.
- **Audit trail:** selected student, payment and attendance changes are logged and visible in a read-only admin screen. A live system overview shows core record counts.

## Before you sell
This is still a customer-installable template, not a shared SaaS product. Every teacher/customer must have a separate Supabase project and Netlify site. The payment integration requires a PayHere merchant account; automated email/SMS/WhatsApp delivery still needs provider-specific configuration and a sending workflow. Run every migration in a disposable Supabase project and test teacher, student, parent and signed-out sessions before real data is used.