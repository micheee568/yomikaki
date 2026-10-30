import { lookupWord } from "@/lib/dictionary/lookup";
import { handle } from "@/lib/errors";
import { lookupSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = (req: Request) =>
  handle(async () => {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    return lookupWord(lookupSchema.parse(params));
  });
