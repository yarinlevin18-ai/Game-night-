import { redirect } from "next/navigation";

// Old links (/room/7625) still work.
export default function OldRoom() {
  redirect("/play");
}
