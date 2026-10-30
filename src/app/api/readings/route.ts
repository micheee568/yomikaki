import { handle, readJson } from "@/lib/errors";
import { createReading, listReadings } from "@/lib/services/readings";
import { getCurrentUser } from "@/lib/user";
import { createReadingSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = () =>
  handle(async () => listReadings((await getCurrentUser()).id));

export const POST = (req: Request) =>
  handle(async () => {
    const input = createReadingSchema.parse(await readJson(req));
    return createReading((await getCurrentUser()).id, input);
  }, 201);
