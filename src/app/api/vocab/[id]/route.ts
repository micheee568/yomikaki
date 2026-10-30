import { handle } from "@/lib/errors";
import { deleteVocabulary } from "@/lib/services/vocab";
import { getCurrentUser } from "@/lib/user";

export const runtime = "nodejs";

export const DELETE = (_req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => deleteVocabulary((await getCurrentUser()).id, (await params).id));
