import { promises as fs } from "node:fs";
import path from "node:path";
import { uploadsDir } from "@/lib/data/store";
import { MEDIA_NAME } from "@/lib/uploads";

/** Serves admin-uploaded images from DATA_DIR/uploads. */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!MEDIA_NAME.test(name)) return new Response("Not found", { status: 404 });
  try {
    const file = await fs.readFile(path.join(uploadsDir(), name));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
