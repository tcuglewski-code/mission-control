/**
 * Risk Type Definition
 * Gemeinsamer Type für alle Risk-bezogenen Komponenten
 */
export interface Risk {
  id: string;
  title: string;
  description: string | null;
  category: string;
  probability: number;
  impact: number;
  riskScore: number | null;
  status: string;
  mitigations: string | null;
  contingency: string | null;
  ownerId: string | null;
  ownerName: string | null;
  projectId: string | null;
  dueDate: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
