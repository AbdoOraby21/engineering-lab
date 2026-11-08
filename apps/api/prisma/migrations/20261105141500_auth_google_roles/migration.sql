-- AlterEnum: drop the retired MANAGER role (only CUSTOMER and ADMIN remain).
-- Postgres cannot drop a single enum value, so the type is recreated.
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
DROP TYPE "Role_old";

-- AlterTable: Google-only accounts have no password
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
