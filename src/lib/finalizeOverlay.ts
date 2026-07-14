// Client-side orchestrator for the "generate raw image → composite text
// overlay in the browser → upload final PNG" pipeline. Centralizes the
// retry policy, error handling and logging so that both CreateImage and
// CreateContent behave identically.
//
// Contract:
//   - Never throws. If anything fails, returns the original imageUrl so
//     the user still sees the generated image (they were already charged
//     for it in generate-image).
//   - Runs the finalize upload with one automatic retry on transient
//     network / 5xx errors.

import { composeImageOverlay, type ClientOverlayPayload } from "@/lib/clientImageOverlay";

export interface FinalizeOverlayInput {
  imageUrl: string;
  actionId: string;
  overlayPayload: ClientOverlayPayload;
  accessToken: string | null | undefined;
}

const FINALIZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finalize-image-overlay`;

async function postFinalize(actionId: string, dataUrl: string, token: string | null | undefined) {
  return fetch(FINALIZE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ actionId, finalImageBase64: dataUrl }),
  });
}

export async function finalizeClientOverlay({
  imageUrl,
  actionId,
  overlayPayload,
  accessToken,
}: FinalizeOverlayInput): Promise<string> {
  let composed: string;
  try {
    composed = await composeImageOverlay(imageUrl, overlayPayload);
  } catch (err) {
    console.error("[overlay] client composition failed, keeping raw image:", err);
    return imageUrl;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await postFinalize(actionId, composed, accessToken);
      if (resp.ok) {
        const json = await resp.json().catch(() => null);
        if (json?.imageUrl) return json.imageUrl as string;
        return imageUrl;
      }
      // Only retry on transient server errors; 4xx are terminal.
      if (resp.status < 500 || attempt === 1) {
        const body = await resp.text().catch(() => "");
        console.warn(`[overlay] finalize failed (${resp.status}), keeping raw image:`, body);
        return imageUrl;
      }
    } catch (err) {
      if (attempt === 1) {
        console.error("[overlay] finalize network error, keeping raw image:", err);
        return imageUrl;
      }
    }
    // Small backoff before retrying transient failures.
    await new Promise((r) => setTimeout(r, 400));
  }
  return imageUrl;
}
