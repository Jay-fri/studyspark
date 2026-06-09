-- Force PostgREST to reload its schema cache so RPC calls resolve correctly
notify pgrst, 'reload schema';
