import { Metadata } from "next";
import EmbedClient from "./EmbedClient";

export const metadata: Metadata = {
  title: "Analytics Widget | Mission Control",
};

export default function EmbedPage() {
  return <EmbedClient />;
}
