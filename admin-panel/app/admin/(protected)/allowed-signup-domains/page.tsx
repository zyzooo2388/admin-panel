import AllowedSignupDomainsPageClient from "./AllowedSignupDomainsPageClient";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AllowedSignupDomainRow = {
  id: string | number;
  created_datetime_utc: string | null;
  apex_domain: string | null;
};

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function AllowedSignupDomainsPage({ searchParams }: Props) {
  await requireSuperadmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("allowed_signup_domains")
    .select("id, created_datetime_utc, apex_domain")
    .order("created_datetime_utc", { ascending: false })
    .limit(500);
  const initialRows = (data ?? []) as AllowedSignupDomainRow[];

  return (
    <AllowedSignupDomainsPageClient
      initialRows={initialRows}
      initialError={params.error ?? (error ? `Failed to load allowed signup domains: ${error.message}` : null)}
      initialSuccess={params.success ?? null}
    />
  );
}
