import CaptionExamplesTableClient from "./CaptionExamplesTableClient";
import { createResourceRowAction, deleteResourceRowAction, updateResourceRowAction } from "@/app/admin/(protected)/_actions/resourceCrudActions";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { loadAdminResource } from "@/lib/admin/resourceData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function CaptionExamplesPage({ searchParams }: Props) {
  await requireSuperadmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const resource = await loadAdminResource(supabase, "caption-examples", 500);

  return (
    <CaptionExamplesTableClient
      title={resource.config.title}
      description={resource.config.description}
      mode={resource.config.mode}
      resourceKey={resource.config.key}
      redirectPath="/admin/caption-examples"
      rows={resource.rows}
      displayColumns={resource.displayColumns.length > 0 ? resource.displayColumns : ["id"]}
      editableColumns={resource.editableColumns}
      idColumn={resource.idColumn}
      columnKinds={resource.columnKinds}
      errorMessage={params.error ?? resource.error}
      successMessage={params.success ?? null}
      createAction={createResourceRowAction}
      updateAction={updateResourceRowAction}
      deleteAction={deleteResourceRowAction}
      requiredColumns={resource.config.requiredColumns}
    />
  );
}
