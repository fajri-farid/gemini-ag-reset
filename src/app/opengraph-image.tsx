import { VARUN_TIMEZONE } from "@/lib/datetime";
import { SHARE_CARD_DIMENSIONS } from "@/lib/share-params";
import { loadShareCardViewModel } from "@/lib/server/share-card-data";
import { renderOgShareImage } from "@/lib/server/share-card-renderer";

export const alt = "Gemini Resets — Antigravity quota reset tracker";
export const size = SHARE_CARD_DIMENSIONS.og;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const viewModel = await loadShareCardViewModel({
    tweetId: null,
    locale: "en",
    timeZone: VARUN_TIMEZONE,
  });

  if (!viewModel) {
    return new Response("Not found", { status: 404 });
  }

  return renderOgShareImage(viewModel);
}
