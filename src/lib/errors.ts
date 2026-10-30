import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new HttpError(404, what);

/** Wraps a route handler body so every failure becomes a consistent `{ error }` JSON response. */
export async function handle<T>(fn: () => Promise<T>, successStatus = 200): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn(), { status: successStatus });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof ZodError) {
      const message = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Parses a request body as JSON, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}
