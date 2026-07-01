// 古い「夜のデータ」を管理者権限で削除する。
// Admin SDK はセキュリティルールをバイパスするので、ルールを閉じたままでも消せる。
const admin = require("firebase-admin");

const sa = JSON.parse(process.env.FIREBASE_SA);
admin.initializeApp({
  credential: admin.credential.cert(sa),
  databaseURL: process.env.DB_URL,
});

(async () => {
  const db = admin.database();

  // しきい値 = 昨日(JST)。これより古いキーだけ削除する。
  // （進行中の夜のバケツは今日 or 昨日の日付なので、必ず残る）
  const jst = new Date(Date.now() + 9 * 3600 * 1000);
  jst.setUTCDate(jst.getUTCDate() - 1);
  const threshold = jst.toISOString().slice(0, 10); // "YYYY-MM-DD"
  console.log("Keeping buckets >= " + threshold);

  const snap = await db.ref("dayIndex").once("value");
  const idx = snap.val() || {};

  let deleted = 0;
  for (const key of Object.keys(idx)) {
    if (key < threshold) {
      console.log("Deleting days/" + key);
      await db.ref("days/" + key).remove();
      await db.ref("dayIndex/" + key).remove();
      deleted++;
    }
  }
  console.log("Done. Deleted " + deleted + " old bucket(s).");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
