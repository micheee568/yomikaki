import { z } from "zod";
import { handle } from "@/lib/errors";
import { getStats } from "@/lib/services/stats";
import { getCurrentUser } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minutes east of UTC (Tokyo = 540), sent by the browser so "today" matches the learner's day.
const querySchema = z.object({ tz: z.coerce.number().int().min(-840).max(840).default(0) });

export const GET = (req: Request) =>
  handle(async () => {
    const { tz } = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    return getStats((await getCurrentUser()).id, new Date(), tz);
  });
