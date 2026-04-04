-- AlterEnum
ALTER TYPE "RecurringInterval" ADD VALUE 'QUARTERLY';

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_clientId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceTemplate" DROP CONSTRAINT "InvoiceTemplate_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_clientId_fkey";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "InvoiceTemplate" DROP COLUMN "amount",
DROP COLUMN "clientId",
DROP COLUMN "dueDate",
DROP COLUMN "paidAt",
DROP COLUMN "status",
ALTER COLUMN "positions" SET NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "iceConfidence" INTEGER,
ADD COLUMN     "iceEase" INTEGER,
ADD COLUMN     "iceImpact" INTEGER,
ADD COLUMN     "iceScore" DOUBLE PRECISION;

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "PomodoroSession";

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Sonstiges',
    "vendor" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "notes" TEXT,
    "receipt" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBudgetConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "dailyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "monthlyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertTelegram" BOOLEAN NOT NULL DEFAULT true,
    "alertEmail" BOOLEAN NOT NULL DEFAULT false,
    "alertEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastDailyAlertAt" TIMESTAMP(3),
    "lastMonthlyAlertAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBudgetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTaskRoi" (
    "id" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "taskDescription" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "agentName" TEXT NOT NULL DEFAULT 'Amadeus',
    "estimatedManualHours" DOUBLE PRECISION NOT NULL,
    "actualAgentMinutes" DOUBLE PRECISION NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savedHours" DOUBLE PRECISION,
    "hourlyRateSaved" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "projectId" TEXT,
    "projectName" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTaskRoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userThreshold" INTEGER NOT NULL DEFAULT 5,
    "taskMonthlyThreshold" INTEGER NOT NULL DEFAULT 100,
    "apiCostThreshold" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "storageThreshold" INTEGER NOT NULL DEFAULT 500,
    "alertTelegram" BOOLEAN NOT NULL DEFAULT true,
    "alertEmail" BOOLEAN NOT NULL DEFAULT false,
    "alertEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cooldownDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellTrigger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerValue" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "suggestedPlan" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "metadata" TEXT,
    "contactedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "location" TEXT,
    "participants" TEXT,
    "agenda" TEXT,
    "notes" TEXT,
    "decisions" TEXT,
    "projectId" TEXT,
    "projectName" TEXT,
    "organizerId" TEXT,
    "organizerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingActionItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT,
    "assigneeName" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "taskId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "decisionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" TEXT,
    "decision" TEXT NOT NULL,
    "alternatives" TEXT,
    "impact" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Tech',
    "status" TEXT NOT NULL DEFAULT 'active',
    "ownerId" TEXT,
    "ownerName" TEXT,
    "projectId" TEXT,
    "projectName" TEXT,
    "tags" TEXT,
    "supersededBy" TEXT,
    "reversedReason" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Tech',
    "probability" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "riskScore" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'identified',
    "mitigations" TEXT,
    "contingency" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "projectId" TEXT,
    "dueDate" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOnboarding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "week" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetGoLive" TIMESTAMP(3),
    "actualGoLive" TIMESTAMP(3),
    "w1_kickoff" BOOLEAN NOT NULL DEFAULT false,
    "w1_requirements" BOOLEAN NOT NULL DEFAULT false,
    "w1_configPlan" BOOLEAN NOT NULL DEFAULT false,
    "w2_domain" BOOLEAN NOT NULL DEFAULT false,
    "w2_database" BOOLEAN NOT NULL DEFAULT false,
    "w2_appSetup" BOOLEAN NOT NULL DEFAULT false,
    "w2_dataImport" BOOLEAN NOT NULL DEFAULT false,
    "w3_adminTraining" BOOLEAN NOT NULL DEFAULT false,
    "w3_workerTraining" BOOLEAN NOT NULL DEFAULT false,
    "w3_testRun" BOOLEAN NOT NULL DEFAULT false,
    "w4_finalCheck" BOOLEAN NOT NULL DEFAULT false,
    "w4_goLive" BOOLEAN NOT NULL DEFAULT false,
    "w4_supportHandover" BOOLEAN NOT NULL DEFAULT false,
    "avvSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "firstPayment" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingCheckConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "alertTelegram" BOOLEAN NOT NULL DEFAULT true,
    "alertSlack" BOOLEAN NOT NULL DEFAULT false,
    "staleDaysThreshold" INTEGER NOT NULL DEFAULT 7,
    "reminderCooldownDays" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingCheckConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOnboarding_tenantId_key" ON "CustomerOnboarding"("tenantId");

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

