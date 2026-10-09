"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  flagRating,
  getRating,
  hideRating,
  listRatings,
  resolveRatingDispute,
} from "@/lib/services/ratings.service";
import type {
  FlagRatingBody,
  HideRatingBody,
  RatingListParams,
  ResolveRatingBody,
} from "@/types/rating";
import { ratingKeys } from "./query-keys";

/** One page of ratings; the previous page stays on screen while the next loads. */
export function useRatings(params: RatingListParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ratingKeys.list(params),
    queryFn: () => listRatings(params),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}

export function useRatingDetail(id: number | string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ratingKeys.detail(id),
    queryFn: () => getRating(id),
    enabled: !!user,
  });
}

// Every moderation action refreshes all rating queries (lists, detail) and shows the backend's
// message if it refuses; the caller can still await mutateAsync to react to the result.
function useRatingMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, successMessage?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ratingKeys.all });
      if (successMessage) toast.success(successMessage);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export const useFlagRating = () =>
  useRatingMutation(
    ({ id, body }: { id: number | string; body: FlagRatingBody }) => flagRating(id, body),
    "Rating flagged for dispute",
  );

export const useResolveRatingDispute = () =>
  useRatingMutation(
    ({ id, body }: { id: number | string; body: ResolveRatingBody }) => resolveRatingDispute(id, body),
    "Dispute resolved",
  );

export const useHideRating = () =>
  useRatingMutation(
    ({ id, body }: { id: number | string; body: HideRatingBody }) => hideRating(id, body),
    "Rating hidden",
  );
