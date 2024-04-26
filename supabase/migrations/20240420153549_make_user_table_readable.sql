create view public.users as select * from auth.users;

--ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
revoke all on public.users from anon, authenticated;