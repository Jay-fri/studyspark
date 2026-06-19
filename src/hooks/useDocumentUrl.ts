import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function fetchSignedUrl(sourceId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${EDGE_BASE}/get-document-url?sourceId=${sourceId}`, {
    headers: {
      "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      "Authorization": `Bearer ${session?.access_token ?? ""}`,
    },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to get document URL" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  
  const { url } = await res.json() as { url: string };
  return url;
}

export function useDocumentUrl(sourceId: string | null) {
  return useQuery({
    queryKey: ["document-url", sourceId],
    queryFn: () => fetchSignedUrl(sourceId!),
    enabled: !!sourceId,
    staleTime: 50 * 60 * 1000, // 50 minutes (URLs expire in 60 min)
    retry: 2,
  });
}
