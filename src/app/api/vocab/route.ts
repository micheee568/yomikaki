import { handle, readJson } from "@/lib/errors";
import { listVocabulary, saveWord } from "@/lib/services/vocab";
import { getCurrentUser } from "@/lib/user";
import { saveWordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = (req: Request) =>
  handle(async () => {
    const q = new URL(req.url).searchParams.get("q") ?? undefined;
    return listVocabulary((await getCurrentUser()).id, q);
  });

export const POST = (req: Request) =>
  handle(async () => {
    const input = saveWordSchema.parse(await readJson(req));
    return saveWord((await getCurrentUser()).id, input);
  }, 201);
