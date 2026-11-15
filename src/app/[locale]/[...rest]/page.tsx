import { notFound } from "next/navigation";

/** Any unknown URL lands here so the branded 404 (with header/footer) is shown. */
export default function CatchAll() {
  notFound();
}
