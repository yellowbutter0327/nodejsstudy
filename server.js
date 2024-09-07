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
//환경변수 설정
require("dotenv").config();

//css사용하고 싶으면 public안에다가 넣던가 폴더 만들고 적어주기
app.use(express.static(__dirname + "/public"));
//데이터 꽂아넣기, view 폴더 만들기
app.set("view engine", "ejs");
//유저가 데이터를 보내면 요청.body로 쉽게 꺼내쓸 수 있게 도와주는 코드
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

//passport 라이브러리 세팅
// process.env.DB_URL
const url = process.env.DB_URL;
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const MongoStore = require("connect-mongo");

// 서버는 이미지 받으면 S3에 업로드 한다.
// multer/formidable 라이브러리 쓰면 편하다.

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

app.use(passport.initialize());
app.use(passport.session());

const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const connectDB = require("./database.js");
const s3 = new S3Client({
  region: "ap-northeast-2", // 서울로 s3 셋팅해놨으면 ap-northeast-2 기입
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRECT,
    // process.env.DB_URL
    //i am 이라고 검색했을 때 나오는
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "yellowbutter",
    key: function (요청, file, cb) {
      cb(null, Date.now().toString());
      //s3에 업로드할 이미지 파일명 작성하는 곳
      //업로드시 파일명 변경가능
      //파일명이 겹치지 않기 위해서 랜덤한 시간이나 문자를 기입하는 경우가 있음.
    },
  }),
});

//upload.single('input 이름')함수 실행하면 S3에 업로드 된다.
// let connectDB = require("./database.js");

let db;

connectDB
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

//미들웨어 함수에서는
//요청,응답을 자유롭게 사용할 수 있다.
function checkLogin(요청, 응답, next) {
  console.log("checklogin", 요청.user);
  if (!요청.user) {
    응답.send("로그인하세요");
  }
  next();
  //next()는 미들웨어 실행 다 끝나면 다음으로 이동해달라
}

//html 파일 보내고 싶을때 sendFile
//이런식으로 함수를 가운데 넣으면 요청과 응답 사이에 실행된다. => 미들웨어
//1.checkLogin대신에 ()=>{}이렇게도 코드 짤 수 있다.
//2.여러개 넣을 수도 있다. [ , , ] 이런식으로
//3.app.use(checkLogin)하면 이 코드 밑에 있는 모든 api에 미들웨어가 적용된다.
//4.제한사항으로 app.use('/URL',checkLogin) url로 get,post..요청할때만 미들웨어를 실행해준다.
//하위 URL도 실행해준다! app.use는 아래쪽부터 실행되기 때문에 보통 위쪽쯤에 넣는다.
app.get("/", checkLogin, (요청, 응답) => {
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
  // console.log(result[0].title);
  //   응답.send(result[0].title);
  //응답은 1개만 가능하다.
  const username = 요청.user ? 요청.user.username : "Anonymous";
  응답.render("list.ejs", { 글목록: result, username: username });
  // console.log("listresult", result);
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

//upload.single : name="img1"가진 이미지 들어오면 s3에 자동 업로드 해준다.
app.post("/add", upload.single("img1"), async (요청, 응답) => {
  // 업로드 완료시 이미지 url 생성해준다. 그게 바로 요청.file이다.
  // 여러장 업로드 하고 싶으면 upload.single 대신 upload.array
  // input 에 name 속성 적고  ("img1",2) 이렇게 최대 이미지 개수 적어준다.
  console.log(요청.file);
  //업로드 후 URL은 요청.file 안에 들어있다.
  //여기서 요청.body는 {title: '' , content: ''} 이런 형식일듯
  //요청.file.location 해서 나온 주소를 igg src 안에 넣으면 되겠지
  try {
    if (요청.body.title === "") {
      응답.send("잘못된 요청입니다.");
    } else {
      await db.collection("post").insertOne({
        title: 요청.body.title,
        content: 요청.body.content,
        img: 요청.file ? 요청.file.location : "",
        user: 요청.user._id,
        username: 요청.user.username,
      });
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
    let result2 = await db
      .collection("comment")
      .find({ parentId: new ObjectId(요청.params.id) })
      .toArray();
    console.log(result);
    if (result == null) {
      응답.status(400).send("이상한 url 입력함!");
    } else {
      응답.render("detail.ejs", { result: result, result2: result2 });
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

app.delete("/delete", async (req, res) => {
  const { docid } = req.query;
  console.log("삭제할거", docid, "유저", req.user._id);
  try {
    // 현재 로그인한 유저의 글만 삭제 가능
    await db.collection("post").deleteOne({
      _id: new ObjectId(docid),
      user: new ObjectId(req.user._id),
    });

    res.send("삭제 완료");
  } catch (error) {
    console.error("삭제 실패:", error);
    res.status(500).send("서버 에러");
  }

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

// app.use("/", require("./routes/shop.js"));

//검색기능만들기1 (문제는 제목이 정확히 일치해야 찾아줌 => regex 쓰면 포함된거 찾아줌) => 문제 속도 느림
// app.get("/search", async (요청, 응답) => {
//   console.log(요청.query.val);
//   let result = await db
//     .collection("post")
//     .find({ title: { $regex: 요청.query.val } })
//     .toArray();
//   응답.render("search.ejs", { 글목록: result });
// });

//검색기능만들기2
//정규식 써서 일부 글씨만 포함되어도 검색될 수 있게 한다.
//문제는 느려짐
//그래서 index를 사용한 binary search를 한다.
//binary search 하려면 정렬을 우선 해야함.
//mongodb에서 index 만들어서 검색
//필드 적어주고 문자면 "text", 숫자면 1 또는 -1을 적어준다.

//explain 하면 find 성능 체크할 수 있음
// app.get("/search", async (요청, 응답) => {
//   console.log(요청.query.val);
//   let result = await db
//     .collection("post")
//     .find({ $text: { $search: 요청.query.val } })
//    (검색기능)) .toArray()
//    (성능검사) .explain('executionStats);
//   응답.render("search.ejs", { 글목록: result });
// });

//index의 단점 : 만들면 용량 차지한다. 그래서 검색에 필요한 것만 만들어두던가..
//document 추가/수정/삭제시 index에도 반영해야한다.
//정확한 단어 검색만 되네? 띄어쓰기 허용안되고..
//정규식써서 검색시 index 거의 못 쓴다.
//index를 입력하는건 문자말고 숫자일때..가 유용함
//그래서 search index(full text index)를 만들어 써야함.

//search index : 문장에서 조사, 불용어 등 제거 - 모든 단어 뽑아서 정렬 - 어떤 document 등장했는지 기재
//search index로 검색 순위 조절 등 할 수 있다.
//search index 만들면 .find 대신 .aggregate 사용
//find는 검색조건 1개뿐이었는데 aggregate는 여러개 가능 .aggregate([{조건1},{조건2}])
app.get("/search", async (요청, 응답) => {
  let searchItem = 요청.query.val;
  console.log("검색어", searchItem);
  let searchCondition = [
    {
      $search: {
        index: "title_index", //mongodb에서 search index로 만둘어둔 이름
        text: { query: searchItem, path: "title" }, //path는 검색할 필드
      },
    },
    // { $sort: { _id: 1 } }, //필드값으로 결과 정렬은 $sort : {필드 : 1} 이렇게 -1로 역순정렬도 가능
    // { $skip: 10 }, // 위에서 10개 건너뛰기
    // { $limit: 10 }, // 결과수 제한은 $limit : 수량
    // { $project: { title: 1, content: 1 } }, // 필드 숨기기 - 어떤 필드 숨기려면 0 , 보이려면 1, 타이틀 필드 보여지게
  ];
  let result = await db.collection("post").aggregate(searchCondition).toArray();
  console.log("검색결과", result);
  //toArray 말고 .explain('executionStats') 하면 쿼리 얼마나 걸리는지 속도 알 수 있음
  응답.render("search.ejs", { 글목록: result });
});

//댓글 기능
// app.post("/comment", async (요청, 응답) => {
//   console.log("댓글 요청 받음:", 요청.body); // 요청 데이터 확인
//   await db.collection("comment").insertOne({
//     content: 요청.body.content,
//     writerId: new ObjectId(요청.user._id),
//     writer: 요청.user.username,
//     parentId: new ObjectId(요청.body.parentId),
//   });
//   // post 한 다음에는 항상 다른 페이지로 요청되기 때문
//   // '뒤로 가기'가 아니라 사용자가 요청을 보낸 페이지로 리디렉션하는 동작
//   응답.redirect("back");
// });

app.post("/comment", checkLogin, async (req, res) => {
  try {
    let result = await db.collection("comment").insertOne({
      content: req.body.content,
      writerId: new ObjectId(req.user._id),
      writer: req.user.username,
      parentId: new ObjectId(req.body.parentId),
    });
    res.redirect("back");
  } catch (error) {
    console.error(error);
    res.status(500).send("댓글 작성 중 오류가 발생했습니다.");
  }
});

// app.get("/detail/:id", async (요청, 응답) => {
//   let result = await db
//     .collection("post")
//     .findOne({ _id: new ObjectId(요청.params.id) });
//   let result2 = await db
//     .collection("comment")
//     .find({ parentId: new ObjectId(요청.params.id) })
//     .toArray();
//   응답.render("detail.ejs", { result: result, result2: result2 });
// });
