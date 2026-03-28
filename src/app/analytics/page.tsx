import { Metadata } from "next";
import AnalyticsClient from "./AnalyticsClient";

export const metadata: Metadata = {
  title: "Analytics | Mission Control",
  description: "Erweitertes Analytics-Dashboard mit Projekt- und Team-KPIs",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
