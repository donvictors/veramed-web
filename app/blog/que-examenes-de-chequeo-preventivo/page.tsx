import { permanentRedirect } from "next/navigation";

export default function LegacyPreventiveCheckupArticlePage() {
  permanentRedirect("/blog/examenes-chequeo-preventivo");
}
