import { handle } from "@/lib/errors";
import { deleteReading, getReading } from "@/lib/services/readings";
import { getCurrentUser } from "@/lib/user";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (_req: Request, { params }: Ctx) =>
  handle(async () => getReading((await getCurrentUser()).id, (await params).id));

export const DELETE = (_req: Request, { params }: Ctx) =>
  handle(async () => deleteReading((await getCurrentUser()).id, (await params).id));
