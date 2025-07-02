const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multerconfig = require("./config/multer.config");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/upload", (req, res) => {
  res.render("dpedit");
});

app.post("/upload",checklogin, multerconfig.single("image"), async(req, res) => {
  await userModel.findOneAndUpdate({_id:req.user.id},{profilepic:req.file.filename});
  res.redirect("/profile");
});

app.post("/register", async (req, res) => {
  const { name, username, age, email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (user) {
    res.send(`User already exists`);
    res.redirect("/");
  } else {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, async (err, hash) => {
        let user = await userModel.create({
          name,
          username,
          age,
          email,
          password: hash,
        });
        let token = jwt.sign({ email: user.email, id: user._id }, "shhhh");
        res.cookie("token", token);
        res.send("Registered");
      });
    });
  }
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.status(500).send(`Something went wrong`);

  bcrypt.compare(password, user.password, function (err, reasult) {
    if (reasult) {
      let token = jwt.sign({ email: user.email, id: user._id }, "shhhh");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else res.redirect("/login");
  });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

app.get("/profile", checklogin, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");

  res.render("profile", { user });
});

app.post("/post", checklogin, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;

  let post = await postModel.create({
    user: user._id,
    content,
  });

  user.posts.push(post._id);
  await user.save();
  let posts = await postModel.find();
  res.redirect("/profile");
});

app.get("/like/:id", checklogin, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");

  if (post.likes.indexOf(req.user.id) === -1) {
    post.likes.push(req.user.id);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.id), 1);
  }
  await post.save();
  res.redirect(req.get("referer"));
});

app.get("/edit/:postid", checklogin, async (req, res) => {
  let post = await postModel
    .findOne({ _id: req.params.postid })
    .populate("user");

  res.render("edit", { post });
});

app.post("/edit/:postid", checklogin, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.postid });
  post.content = req.body.content;

  await post.save();
  res.redirect(req.get("referer"));
});
app.get("/delete/:postid", checklogin, async (req, res) => {
  let post = await postModel.findOneAndDelete({ _id: req.params.postid });
  res.redirect(req.get("referer"));
});

app.get("/allposts", checklogin, async (req, res) => {
  let posts = await postModel.find().populate("user");
  let user = req.user;
  console.log(user);
  res.render("allposts", { posts, user });
});

//<-----------Middlewares------------->

function checklogin(req, res, next) {
  if (req.cookies.token === "") return res.redirect("/login");
  else {
    let data = jwt.verify(req.cookies.token, "shhhh");
    req.user = data;
    next();
  }
}

app.listen(3000);
