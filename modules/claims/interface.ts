// Public contract for the claims module.
// Other modules import only from here, never from internal/.

export type { ClaimSummary, ClaimDetail, PhotoRecord } from "./internal/types";
export {
  createClaim,
  getClaimDetail,
  listClaims,
  submitReview,
  markAssessed,
  markRouted,
  markAutoApproved,
} from "./internal/service";
