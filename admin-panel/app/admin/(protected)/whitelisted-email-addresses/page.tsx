import WhitelistedEmailAddressesPageClient from "./WhitelistedEmailAddressesPageClient";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WhitelistedEmailAddressRow = {
  id: string | number;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  email_address: string | null;
};

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function WhitelistedEmailAddressesPage({ searchParams }: Props) {
  await requireSuperadmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("whitelist_email_addresses")
    .select("id, created_datetime_utc, modified_datetime_utc, email_address")
    .order("created_datetime_utc", { ascending: false })
    .limit(500);
  const initialRows = (data ?? []) as WhitelistedEmailAddressRow[];

  return (
    <WhitelistedEmailAddressesPageClient
      initialRows={initialRows}
      initialError={params.error ?? (error ? `Failed to load whitelisted email addresses: ${error.message}` : null)}
      initialSuccess={params.success ?? null}
    />
  );
}
