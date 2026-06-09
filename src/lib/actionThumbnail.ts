/**
 * Resolve the thumbnail URL for an action card.
 *
 * Mirrors the logic used on /history (useHistoryActions) so the Dashboard and
 * History page produce the same URLs from the same RPC payload.
 */

const STORAGE_MARKER = "/storage/v1/object/public/content-images/";

const toStorageObjectPath = (value?: string | null): string | null => {
  if (!value) return null;

  if (value.startsWith("http")) {
    const idx = value.indexOf(STORAGE_MARKER);
    if (idx >= 0) {
      const rest = value.slice(idx + STORAGE_MARKER.length);
      return rest.split("?")[0] || null;
    }
    // External http URL — return as-is signal via null so caller falls back
    return null;
  }

  return value.replace(/^\/+/, "").replace(/^content-images\//, "");
};

export interface ResolveThumbnailInput {
  thumbPath?: string | null;
  imageUrl?: string | null;
}

/**
 * @param input - thumbPath/imageUrl as returned by get_action_summaries
 * @param storageBase - e.g. `${VITE_SUPABASE_URL}/storage/v1/object/public/content-images/`
 */
export const resolveActionThumbnail = (
  input: ResolveThumbnailInput,
  storageBase: string,
): string | null => {
  const { thumbPath, imageUrl } = input;

  if (thumbPath && storageBase) {
    if (thumbPath.startsWith("http")) {
      const objectPath = toStorageObjectPath(thumbPath);
      if (objectPath) return `${storageBase}${objectPath}`;
      return thumbPath; // external URL
    }
    const objectPath = toStorageObjectPath(thumbPath);
    if (objectPath) return `${storageBase}${objectPath}`;
  }

  if (imageUrl) {
    if (imageUrl.startsWith("data:")) return imageUrl;
    if (imageUrl.startsWith("http")) {
      const objectPath = toStorageObjectPath(imageUrl);
      if (objectPath && storageBase) return `${storageBase}${objectPath}`;
      return imageUrl;
    }
    if (storageBase) {
      const objectPath = toStorageObjectPath(imageUrl);
      if (objectPath) return `${storageBase}${objectPath}`;
    }
  }

  return null;
};
