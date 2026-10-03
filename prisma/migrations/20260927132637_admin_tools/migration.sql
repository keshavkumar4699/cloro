-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "removedReason" TEXT;

-- CreateTable
CREATE TABLE "StaffNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffNote_userId_createdAt_idx" ON "StaffNote"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "StaffNote" ADD CONSTRAINT "StaffNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNote" ADD CONSTRAINT "StaffNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
