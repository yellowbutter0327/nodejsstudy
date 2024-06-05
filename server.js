//npm init -y
//npm install express
//node 파일명으로 실행 -> node server.js
//npm install -g nodemon
//nodemon server.js
//npm install ejs

const express = require("express");
const app = express();
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const methodOverride = require("method-override");
//css사용하고 싶으면 public안에다가 넣던가 폴더 만들고 적어주기
app.use(express.static(__dirname + "/public"));
//데이터 꽂아넣기, view 폴더 만들기
app.set("view engine", "ejs");
//유저가 데이터를 보내면 요청.body로 쉽게 꺼내쓸 수 있게 도와주는 코드
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

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
  try {
    if (요청.body.title === "") {
      응답.send("잘못된 요청입니다.");
    } else {
      await db
        .collection("post")
        .insertOne({ title: 요청.body.title, content: 요청.body.content });
      // 응답.send()
      응답.redirect("/list");
    }
  } catch (e) {
    console.log(e);
    응답.status(500).send("서버에러");
  }
});

//url parameter

app.get("/detail/:id", async (요청, 응답) => {
  try {
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(요청.params.id) });
    if (result == null) {
      응답.status(400).send("이상한 url 입력함!");
    } else {
      응답.render("detail.ejs", { result: result });
    }
  } catch (e) {
    console.log(e);
    응답.status(400).send("이상한 url 입력함");
  }
});

//글 수정 기능
app.get("/edit/:id", async (요청, 응답) => {
  //글 수정하고 싶으면 updateOne({어떤 document}, {$set:{어떤 내용으로 수정할지}})
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(요청.params.id) });
  console.log(result);
  응답.render("edit.ejs", { result: result });
});

app.put("/edit", async (요청, 응답) => {
  //db.collection('post').updateOne({_id:1}, {$set: {like : 1}}) 이러면 id가 1인걸 찾아 like를 1로 바꿔준다.
  //set은 덮어쓰기, inc은 1 증가, mul은 곱셈, unset은 필드값 삭제,
  //동시에 여러개 수정은 updateOne말고 updateMany
  //like 항목이 10이 넘는 모든 document 찾을때 : updateMany({like: {$gt:10}}) 이렇게하면 like가 10보다 큰걸 모두 바꿔줌
  await db.collection("post").updateOne(
    { _id: new ObjectId(요청.body.id) },
    { $set: { title: 요청.body.title, content: 요청.body.content } }
    //{$inc : {like: -2}} 이렇게 하면 기존 숫자 증감하고 싶을때
  );
  응답.redirect("/list");
});

// app.post("/abc", async (요청, 응답) => {
//   console.log("안녕");
//   console.log(요청.body);
// });

//파라미터인 경우
// app.get('/abc/:id', async(요청,응답) => {
// console.log(요청.params)
// })

//쿼리스트링일 경우
// app.get("/abc", async (요청, 응답) => {
//   console.log(요청.query);
// });

app.delete("/delete", async (요청, 응답) => {
  console.log(요청.query);
  let result = await db.collection("post").deleteOne({ _id: 요청.query.docid });
  응답.send("삭제완료");
  //ajax 요청시 응답.redirect 응답.render 사용안하는게 낫다.
  //새로고침 안하려고 ajax 사용하는건데 새로고침하면 의미가 없기 때문임
});
