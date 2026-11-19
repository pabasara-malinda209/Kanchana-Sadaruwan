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

### 5. Deploy
Connect this GitHub repository to Netlify or GitHub Pages. Publish the repository root. Re-deploy after updating files.

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
