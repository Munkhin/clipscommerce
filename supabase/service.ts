import { createClient as createClientComponent } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";

export const createServiceClient = () => {
  return createClientComponent();
}
