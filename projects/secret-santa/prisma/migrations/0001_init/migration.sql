-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "budget" TEXT,
    "eventDate" TEXT,
    "rules" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "accessToken" TEXT NOT NULL,
    "assignedToId" TEXT,
    "notificationStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "notifiedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_adminToken_key" ON "Event"("adminToken");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_accessToken_key" ON "Participant"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_assignedToId_key" ON "Participant"("assignedToId");

-- CreateIndex
CREATE INDEX "Participant_eventId_idx" ON "Participant"("eventId");

-- CreateIndex
CREATE INDEX "Participant_accessToken_idx" ON "Participant"("accessToken");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
