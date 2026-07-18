-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL DEFAULT 'Unknown Artist',
    "album" TEXT NOT NULL DEFAULT 'Unknown Album',
    "duration" INTEGER NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "youtubeId" TEXT,
    "originalUrl" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'UPLOAD',
    "fileSize" INTEGER,
    "bitrate" INTEGER,
    "description" TEXT,
    "youtubeUploadDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Song" ("album", "artist", "audioUrl", "coverUrl", "createdAt", "duration", "id", "playCount", "title", "updatedAt", "uploadDate") SELECT "album", "artist", "audioUrl", "coverUrl", "createdAt", "duration", "id", "playCount", "title", "updatedAt", "uploadDate" FROM "Song";
DROP TABLE "Song";
ALTER TABLE "new_Song" RENAME TO "Song";
CREATE UNIQUE INDEX "Song_youtubeId_key" ON "Song"("youtubeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
