import { apiGet, apiGetPage, apiPost } from "@/lib/api";
import type {
  FlagRatingBody,
  HideRatingBody,
  Rating,
  RatingListParams,
  RatingsPage,
  ResolveRatingBody,
} from "@/types/rating";

// Ratings/reviews moderation — the backend's `/support-desk/ratings/*` (needs rating.view /
// rating.moderate). Flag, resolve and hide never touch stars/comment — only visibility and
// dispute metadata — see RidesAdminService's rating moderation methods.

const BASE = "/support-desk/ratings";

/** One page of ratings, newest first; `meta.summary` carries per-direction counts/averages. */
export async function listRatings(params: RatingListParams): Promise<RatingsPage> {
  return (await apiGetPage<RatingsPage["data"][number]>(BASE, { params })) as RatingsPage;
}

export const getRating = (id: number | string) => apiGet<Rating>(`${BASE}/${id}`);

export const flagRating = (id: number | string, body: FlagRatingBody) =>
  apiPost<Rating>(`${BASE}/${id}/flag`, body);

export const resolveRatingDispute = (id: number | string, body: ResolveRatingBody) =>
  apiPost<Rating>(`${BASE}/${id}/resolve`, body);

export const hideRating = (id: number | string, body: HideRatingBody) =>
  apiPost<Rating>(`${BASE}/${id}/hide`, body);
