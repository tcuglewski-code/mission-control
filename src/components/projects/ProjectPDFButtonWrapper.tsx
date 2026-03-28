'use client';

import dynamic from "next/dynamic";

// Client Component Wrapper — erlaubt ssr: false für @react-pdf/renderer
const ProjectPDFButton = dynamic(
  () => import("@/components/projects/ProjectReportPDF").then((m) => m.ProjectPDFButton),
  { ssr: false, loading: () => null }
);

export { ProjectPDFButton };
