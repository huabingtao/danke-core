CREATE TABLE "ItemCategory" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "ResourceType" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "ItemCategoryLink" ("itemId" TEXT NOT NULL, "categoryId" TEXT NOT NULL, PRIMARY KEY ("itemId", "categoryId"), FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE TABLE "UserViewPreference" ("userId" TEXT NOT NULL, "viewKey" TEXT NOT NULL, "selectedItemIds" TEXT NOT NULL, PRIMARY KEY ("userId", "viewKey"), FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
ALTER TABLE "Item" ADD COLUMN "resourceTypeId" TEXT REFERENCES "ResourceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
INSERT INTO "ItemCategory" VALUES ('equipment','装备',0),('agent','特工',1),('pet','宠物',2),('tech','配件',3),('collection','收藏品',4),('vehicle','载具',5),('general','通用资源',6),('event','活动资源',7);
INSERT INTO "ResourceType" VALUES ('core','核心',0),('chest','宝箱',1),('fragment','碎片',2),('key','钥匙',3),('blueprint','图纸',4),('currency','货币',5),('material','养成材料',6),('consumable','消耗品',7),('other','其他',8);
