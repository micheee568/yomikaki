import { handle, readJson } from "@/lib/errors";
import { updateProgress } from "@/lib/services/readings";
import { getCurrentUser } from "@/lib/user";
import { progressSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const PUT = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const { position } = progressSchema.parse(await readJson(req));
    return updateProgress((await getCurrentUser()).id, (await params).id, position);
  });
