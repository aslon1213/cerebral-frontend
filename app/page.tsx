import { redirect } from "next/navigation";

export default function HomePage() {
  // Projects are the entry point to everything else.
  redirect("/projects");
}
