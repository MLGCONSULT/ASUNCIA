import { redirect } from "next/navigation";

/** Redirection : l'onglet Leads a été retiré. */
export default function LeadsRedirect() {
  redirect("/app/dashboard");
}
