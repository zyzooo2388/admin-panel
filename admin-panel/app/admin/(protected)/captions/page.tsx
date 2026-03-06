import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";
import { CAPTION_TEXT_FALLBACK_COLUMNS, CREATED_TIMESTAMP_FALLBACK_COLUMNS, pickFirstWorkingColumn } from "@/lib/db/columnFallback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CaptionsPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const textColumn = await pickFirstWorkingColumn(supabase, "captions", CAPTION_TEXT_FALLBACK_COLUMNS);
  const imageIdColumn = await pickFirstWorkingColumn(supabase, "captions", ["image_id"]);
  const userIdColumn = await pickFirstWorkingColumn(supabase, "captions", ["user_id"]);
  const createdColumn = await pickFirstWorkingColumn(supabase, "captions", CREATED_TIMESTAMP_FALLBACK_COLUMNS);

  let captions: Record<string, unknown>[] | null = null;
  let errorMessage: string | null = null;

  if (!textColumn) {
    errorMessage = `Failed to load captions: none of these text columns exist: ${CAPTION_TEXT_FALLBACK_COLUMNS.join(", ")}`;
  } else {
    const selectColumns = ["id", textColumn];
    if (imageIdColumn) {
      selectColumns.push(imageIdColumn);
    }
    if (userIdColumn) {
      selectColumns.push(userIdColumn);
    }
    if (createdColumn) {
      selectColumns.push(createdColumn);
    }

    let query = supabase.from("captions").select(selectColumns.join(", "));
    if (createdColumn) {
      query = query.order(createdColumn, { ascending: false });
    }

    const { data, error } = await query.limit(500);
    captions = data as Record<string, unknown>[] | null;
    errorMessage = error ? `Failed to load captions: ${error.message}` : null;
  }

  const showImageId = Boolean(imageIdColumn);
  const showUserId = Boolean(userIdColumn);
  const showCreated = Boolean(createdColumn);
  const colSpan = 1 + (showImageId ? 1 : 0) + (showUserId ? 1 : 0) + (showCreated ? 1 : 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Captions</h1>
      <p className="mt-1 text-sm text-zinc-600">Read-only list of captions from staging.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Caption</th>
              {showImageId ? <th className="px-4 py-3">Image ID</th> : null}
              {showUserId ? <th className="px-4 py-3">User ID</th> : null}
              {showCreated ? <th className="px-4 py-3">Created</th> : null}
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td className="px-4 py-4 text-red-600" colSpan={colSpan}>
                  {errorMessage}
                </td>
              </tr>
            ) : captions && captions.length > 0 ? (
              captions.map((caption) => {
                const id = String(caption.id ?? "");
                const captionValue = String(caption[textColumn as string] ?? "-");
                const createdValue = showCreated ? caption[createdColumn as string] : null;

                return (
                  <tr key={id} className="border-t border-zinc-100 text-zinc-700">
                    <td className="max-w-xl px-4 py-3">{captionValue}</td>
                    {showImageId ? <td className="px-4 py-3 font-mono text-xs">{String(caption[imageIdColumn as string] ?? "-")}</td> : null}
                    {showUserId ? <td className="px-4 py-3 font-mono text-xs">{String(caption[userIdColumn as string] ?? "-")}</td> : null}
                    {showCreated ? <td className="px-4 py-3">{createdValue ? new Date(String(createdValue)).toLocaleString() : "-"}</td> : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={colSpan}>
                  No captions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
