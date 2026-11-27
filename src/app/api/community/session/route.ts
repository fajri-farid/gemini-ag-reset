import type { NextRequest } from "next/server";
import { startCommunitySession } from "@/lib/server/community-request";

export function POST(request: NextRequest) {
  return startCommunitySession(request);
}
