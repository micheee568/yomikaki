import { handle } from "@/lib/errors";
import { saveUnknownWords } from "@/lib/services/readings";
import { getCurrentUser } from "@/lib/user";

export const runtime = "nodejs";

export const POST = (_req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => saveUnknownWords((await getCurrentUser()).id, (await params).id));
