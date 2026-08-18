-- Las tablas se consultan mediante el backend con Prisma, no directamente
-- desde la API pública de Supabase. Sin políticas, RLS bloquea anon/authenticated.
ALTER TABLE public."ConversacionTavus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
