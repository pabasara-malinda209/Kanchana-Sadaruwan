-- Prevent teacher accounts from changing profile roles directly through the REST API.
-- Role changes are handled only by trusted SQL setup or the checked SECURITY DEFINER account-link function.
drop policy if exists "teacher update profiles" on public.profiles;
