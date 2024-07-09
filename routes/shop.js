const router = require("express").Router();

//upload.single('input 이름')함수 실행하면 S3에 업로드 된다.
let connectDB = require("./../database.js");

let db;
connectDB
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
  })
  .catch((err) => {
    console.log(err);
  });

router.get("/shirts", async (요청, 응답) => {
  await db.collection("post").find().toArray();
  응답.send("셔츠 파는 페이지입니다");
});

router.get("/pants", (요청, 응답) => {
  응답.send("바지 파는 페이지입니다");
});

module.exports = router;
