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
const bcrypt = require("bcrypt");

//css사용하고 싶으면 public안에다가 넣던가 폴더 만들고 적어주기
app.use(express.static(__dirname + "/public"));
//데이터 꽂아넣기, view 폴더 만들기
app.set("view engine", "ejs");
//유저가 데이터를 보내면 요청.body로 쉽게 꺼내쓸 수 있게 도와주는 코드
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

//passport 라이브러리 세팅
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");

app.use(passport.initialize());
app.use(
  session({
    secret: "1234",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }, //세션 유효기간 변경가능, 이건 1시간
    // DB에 접속해서 forum이라는 데이터베이스 안에 sessions라는 컬렉션을 만들어서
    // 거기에 세션을 알아서 보관.
    // 유효기간 지나면 자동으로 삭제도 알아서 해준다.
    store: MongoStore.create({
      mongoUrl: url,
      dbName: "forum",
    }),
  })
);

app.use(passport.session());

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

//페이지네이션
//1번 버튼 누르면 1~5번 글 보여줌
//2번 버튼 누르면 6~10번 글 보여줌
//3번 버튼 누르면 1~15번 글 보여줌

// app.get("list/:id", async (요청, 응답) => {
//   //skip은 0개 건너뛰고 limit개 보여달라.
//   let result = await db
//     .collection("post")
//     .find()
//     .skip((요청.params.id - 1) * 5)
//     .limit(5)
//     .toArray();
//   응답.render("list.ejs", { 글목록: result });
// });

//skip에 큰 숫자가 들어가면 성능이 안 좋아진다.
//find안에다가 조건식 가져오는 방법이 있다.
//바로 다음 페이지만 가져오게 하는 방법
app.get("list/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    // $gt : 방금본마지막게시물_id
    .find({ _id: { $gt: 방금본마지막게시물_id } })
    .limit(5)
    .toArray();
  응답.render("list.ejs", { 글목록: result });
});

app.get("list/next/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    // $gt : 방금본마지막게시물_id
    .find({ _id: { $gt: new ObjectId(요청.params.id) } })
    .limit(5)
    .toArray();
  응답.render("list.ejs", { 글목록: result });
});

//글 순서/번호가 중요하고, n번째 페이지를 자주 보여줘야한다면 _id를 정수로 저장한다.

//유저가 제출한 아이디, 비번 맞는지 검사하는 코드
//passport.authenticate('local') 쓰면 이 기능이 실행이 된다.
//db 조회하는 것도 try, catch로 예외 처리 가능하다.
//아이디/비번 외에 다른 것도 제출받아서 검증하려면 passReqToCallback 옵션으로 검증
passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db
      .collection("user")
      .findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }
    // result.password == 입력한비번 이렇게 하면 hash된 값으로는 비교 어려우니까 bcrypt.compare을 사용한다.
    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

app.get("/login", async (요청, 응답) => {
  응답.render("login.ejs");
});

app.post("/login", async (요청, 응답, next) => {
  //유저가 보낸 아이디, 비번을 DB와 비교하는 코드가 실행된다.
  //error, 성공, 실패시 이유 순
  passport.authenticate("local", (error, user, info) => {
    if (error) return 응답.status(500).json(error);
    if (!user) return 응답.status(401).json(info.message);
    //세션만들어줌
    요청.logIn(user, (err) => {
      if (err) return next(err);
      //로그인이 완료됐을대 메인 페이지로!
      응답.redirect("/");
    });
  })(요청, 응답, next);
});

//로그인 시 세션만들기 -> passport.serializeUser();
//세션 id 담긴 쿠키 보내주기

//요청.login할때마다 안에 있는 코드가 실행된다.
//null 다음에 있는 세션 document를 만들어주고 쿠키도 알아서 만들어준다.
//아직 db 생성안해서 메모리에 발행해줌.
passport.serializeUser((user, done) => {
  //nextTick: node.js에서 내부 코드를 비동기적으로 처리해줌 (queueMicrotask()와 유사)
  // if (result.password == 입력한비번) {
  //   return cb(null, result);
  //아까 여기서 받은 result 때문에 console.log(user) 하면 정보가 찍힘
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
    //로그인 시 세션 docmuent 를 발행히주고 document의 _id를 쿠키에 적어 보내준다.
  });
});

//유저가 보낸 쿠키 분석
//쿠키가 이상 없으면 현재 로그인된 유저 정보를 알려준다.
passport.deserializeUser((user, done) => {
  process.nextTick(() => {
    return done(null, user);
  });
});
//이럴 경우에는 세션 정보 갖고 있는 쿠키를 가지고 있는 유저가
//요청을 날릴 때마다 실행된다. 메인 페이지 접속하거나 이러면 비효율적이다.
//deserializer를 특정 api에서만 실행 가능

//회원가입 기능
app.get("/register", (요청, 응답) => {
  응답.render("register.ejs");
});

app.post("/register", async (요청, 응답) => {
  //비밀번호는 암호화해서 저장하는게 좋다.(해싱)
  //bcrypt 대신에 argon2, scrypt 등을 써도 된다.
  //단순히 유저 비밀번호로 해싱하는게 아니라, 비밀번호 + abc123 이렇게 뒤에 '솔트'를 붙여서 해싱하는게 좋다.
  //salt를 쓰면 lookup table attack/rainbow table attakc등의 해킹을 막을 수 있다.
  //salt는 다른 곳에 보관할 수 있는데 그럼 pepper라고 부른다.
  let hash = await bcrypt.hash(요청.body.password, 10); // 문자 하나 해싱에 대충 50ms 정도 걸린다.
  // console.log(hash);
  await db.collection("user").insertOne({
    username: 요청.body.username,
    password: hash,
  });
  응답.redirect("/");
});

// 세션을 db가 아니라 메모리에 임시저장하면 유저가 로그인인 했을 때 만든 세션 document 등이
// 서버가 재시작되면 세션 document들이 증발한다.
// 세션을 DB에 저장하려면 connect-mongo 설치
