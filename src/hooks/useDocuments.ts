import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useDocumentStore, sourceToDocument } from "@/stores/documentStore";
import type { Source } from "@/types";
import { useEffect } from "react";

export function useDocuments(notebookId?: string) {
  const qc = useQueryClient();
  const { setDocuments } = useDocumentStore();

  const query = useQuery({
    queryKey: ["documents", notebookId],
    queryFn: async (): Promise<Source[]> => {
      let q = supabase.from("sources").select("*").order("created_at", { ascending: false });
      if (notebookId) q = q.eq("notebook_id", notebookId);
      const { data, error } = await q;
      if (error) throw error;
      // Map Source -> legacy Document shape for the document store
      return data ?? [];
    },
  });

  useEffect(() => {
    if (query.data) setDocuments(query.data.map(sourceToDocument));
  }, [query.data, setDocuments]);

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  return { ...query, deleteDoc };
}
