import { Metadata } from "next";
import { LiveDashboardClient } from "./LiveDashboardClient";

export const metadata: Metadata = {
  title: "Live Dashboard — Mission Control",
  description: "Echtzeit-Ansicht: Was passiert gerade im Team?",
};

export default function LivePage() {
  return <LiveDashboardClient />;
}
