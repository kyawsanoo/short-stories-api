const BASE =
  "https://zyczqnpuwpxidaktpfzm.supabase.co/storage/v1/object/public/images/";

export function fixCover(cover) {
  if (!cover) return "https://via.placeholder.com/300x200";

  if (cover.startsWith("http")) return cover;

  return BASE + cover.replace(/^\/+/, "").replace(/^images\//, "");
}