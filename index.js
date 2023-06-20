const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const User = require("./models/user.js");
const { Chat, Message } = require("./models/chat-and-messages");
const sessions = require("express-session");

var session;
app.set("view engine", "ejs");
const db =
  "mongodb+srv://maxim17shiglov08:3BEItGsZzPKiZQ8M@users.rqhyfy5.mongodb.net/?retryWrites=true&w=majority";
app.use(express.static(path.resolve(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const oneDay = 1000 * 60 * 60 * 24;
app.use(
  sessions({
    secret: "d0d96651c9fffb09106a3b648cdcb84b4e03707c17927fc76004536daac06d7a",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false,
  })
);

mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((res) => console.log("connected to db"))
  .catch((error) => console.log(error));

const createPath = (page) => path.resolve(__dirname, "views/" + `${page}.ejs`);
app.get("/", async (req, res) => {
  if (req.session.userid) {
    try {
      // Получение id текущего пользователя из сессии
      const currentUserId = req.session.userid;

      // Получение чатов, в которых участвует текущий пользователь
      const chats = await Chat.find({ participants: currentUserId });

      // Создание массива собеседников
      const interlocutors = [];

      // Перебор чатов и добавление id собеседника в массив
      for (let chat of chats) {
        const interlocutorId = chat.participants.find(
          (participantId) => participantId.toString() !== currentUserId
        );

        interlocutors.push(interlocutorId);
      }
      const interlocutorsData = [];
      for (let int of interlocutors) {
        let tempname = await User.findOne({ _id: int }, "Name");

        interlocutorsData.push(tempname);
      }

      // Создание массива объектов с именами собеседников
      const chatData = chats.map((chat, index) => {
        // Получение имени собеседника из массива
        const interlocutorName = interlocutorsData[index].Name;

        // Создание объекта с именем собеседника
        const chatItem = {
          name: interlocutorName,
          // Другие свойства чата, если необходимо
        };
        console.log(chatItem.name);
        return chatItem;
      });

      // Передача массива чатов на страницу
      res.render("index", { chats: chatData });
    } catch (error) {
      console.error(error);
      next(error);
    }
  } else {
    res.render("login", {
      error: "",
      Email: "",
    });
  }
});

app.get("/login", function (req, res) {
  res.render("login", {
    error: "",
    Email: "",
  });
});

app.post("/login", async (req, res, next) => {
  try {
    // Получение данных из запроса
    const { email, password } = req.body;

    // Поиск пользователя по почте
    const user = await User.findOne({ Mail: email });

    // Проверка наличия пользователя и совпадения пароля
    if (!user || user.Pass !== password) {
      return res.render("login", {
        error: "Неверный email или пароль",
        Email: email,
      });
    }

    session = req.session;
    session.userid = user.id;
    console.log(req.session);
    // Редирект на защищенную страницу или другую страницу при успешной аутентификации
    res.redirect("/");
    // Редирект на основную страницу после авторизации
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
  console.log("destroyed");
});

app.get("/messages", (req, res) => {
  // Проверка, авторизован ли пользователь

  if (req.session.userid) {
    res.render("messages");
  } else {
    res.redirect("/");
  }
});

app.get("/registration", function (req, res) {
  res.render("registration", {
    error: "",
    Name: "",
    Email: "",
  });
});
app.post("/registration", async (req, res, next) => {
  try {
    // Получение данных из запроса
    const { name, email, password } = req.body;

    const existingName = await User.findOne({ Name: name });
    const existingEmail = await User.findOne({ Mail: email });

    if (existingName) {
      // Имя уже занято
      return res.render("registration", {
        error: "Данное имя уже занято",
        Name: name,
        Email: email,
      });
    }

    if (existingEmail) {
      // Почта уже занята
      return res.render("registration", {
        error: "Данная почта уже занята",
        Name: name,
        Email: email,
      });
    }

    // Создание нового пользователя
    const newUser = new User({
      Name: name,
      Mail: email,
      Pass: password,
    });
    // Сохранение нового пользователя в базе данных
    await newUser.save();

    // Редирект на страницу входа
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("listening on *:" + PORT);
});

users = [];
connections = [];

io.on("connection", function (socket) {
  console.log("Успешное соединение");
  connections.push(socket);

  socket.on("disconnect", function (reason) {
    console.log("User 1 disconnected because " + reason);
    connections.splice(connections.indexOf(socket), 1);
  });
  socket.on("send msg", function (data) {
    io.sockets.emit("add msg", { msg: data.msg, name: data.name });
    console.log(data.name);
  });
});
