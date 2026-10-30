import { handle, readJson } from "@/lib/errors";
import { answerCard } from "@/lib/services/reviews";
import { getCurrentUser } from "@/lib/user";
import { answerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = (req: Request) =>
  handle(async () => {
    const input = answerSchema.parse(await readJson(req));
    return answerCard((await getCurrentUser()).id, input);
  });
