//npm init -y
//npm install express
//node 파일명으로 실행 -> node server.js
//npm install -g nodemon
//nodemon server.js
//npm install ejs

const express = require("express");
const app = express();

//css사용하고 싶으면 public안에다가 넣던가 폴더 만들고 적어주기
app.use(express.static(__dirname + "/public"));
//데이터 꽂아넣기, view 폴더 만들기
app.set("view engine", "ejs");
//유저가 데이터를 보내면 요청.body로 쉽게 꺼내쓸 수 있게 도와주는 코드
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//env쓰려고 만든 것
require("dotenv").config();

const { MongoClient } = require("mongodb");

let db;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");
    app.listen(8080, () => {
      console.log("http://localhost:8080 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

// app.get("/", (요청, 응답) => {
//   응답.send("반갑다");
// });

//html 파일 보내고 싶을때 sendFile
app.get("/", (요청, 응답) => {
  응답.sendFile(__dirname + "/index.html");
});

app.get("/about", (요청, 응답) => {
  응답.sendFile(__dirname + "/about.html");
});

app.get("/news", (요청, 응답) => {
  db.collection("post").insertOne({ title: "어쩌구" });
  //   응답.send("응답결과");
});

//db 게시물 가져오기
app.get("/list", async (요청, 응답) => {
  let result = await db.collection("post").find().toArray();
  console.log(result[0].title);
  //   응답.send(result[0].title);
  //응답은 1개만 가능하다.
  응답.render("list.ejs", { 글목록: result });
});

app.get("/time", async (요청, 응답) => {
  let result = new Date();
  //   응답.send(result[0].title);
  //응답은 1개만 가능하다.
  응답.render("time.ejs", { 시간: result });
});

//데이터 입출력시 유저한테 가기 전에 체크하는 것 서버가 db랑 통신하는법

app.get("/write", (요청, 응답) => {
  응답.render("write.ejs");
});

app.post("/add", async (요청, 응답) => {
  console.log(요청.body);
  //여기서 요청.body는 {title: '' , content: ''} 이런 형식일듯
  await db
    .collection("post")
    .insertOne({ title: 요청.body.title, content: 요청.body.content });
  // 응답.send()
  응답.redirect("/list");
});
