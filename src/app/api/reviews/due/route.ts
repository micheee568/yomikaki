import { z } from "zod";
import { handle } from "@/lib/errors";
import { getDueCards } from "@/lib/services/reviews";
import { getCurrentUser } from "@/lib/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) });

export const GET = (req: Request) =>
  handle(async () => {
    const { limit } = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    return getDueCards((await getCurrentUser()).id, new Date(), limit);
  });
