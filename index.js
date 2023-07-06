const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const User = require("./models/user.js");
const Friends = require("./models/friends.js");
const { Chat, Message } = require("./models/chat-and-messages");
const session = require("express-session");
var MongoDBStore = require("connect-mongodb-session")(session);

app.set("view engine", "ejs");
const db =
  "mongodb+srv://maxim17shiglov08:3BEItGsZzPKiZQ8M@users.rqhyfy5.mongodb.net/?retryWrites=true&w=majority";
app.use(express.static(path.resolve(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
var store = new MongoDBStore({
  uri: "mongodb+srv://maxim17shiglov08:3BEItGsZzPKiZQ8M@users.rqhyfy5.mongodb.net/?retryWrites=true&w=majority",
  collection: "sessions",
});
// Catch errors
store.on("error", function (error) {
  console.log(error);
});
const oneDay = 1000 * 60 * 60 * 24;

const sessionMiddleware = session({
  secret: "d0d96651c9fffb09106a3b648cdcb84b4e03707c17927fc76004536daac06d7a",
  resave: false,
  saveUninitialized: false,
  store: store,
});
app.use(sessionMiddleware);
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res, next);
});

mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((res) => console.log("connected to db"))
  .catch((error) => console.log(error));

const createPath = (page) => path.resolve(__dirname, "views/" + `${page}.ejs`);

app.get("/", async (req, res, next) => {
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

      // Создание массива объектов с именами собеседников и последними сообщениями
      const chatData = [];
      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i];
        const interlocutorName = interlocutorsData[i].Name;

        // Получение последнего сообщения связанного с этим чатом
        const lastMessage = await Message.findOne({ chat: chat._id })
          .sort({ createdAt: -1 })
          .limit(1);

        const chatItem = {
          name: interlocutorName,
          cId: chat.id,
          lastMsg: lastMessage ? lastMessage.text : "",
          // Другие свойства чата, если необходимо
        };

        chatData.push(chatItem);
      }

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

    req.session.userid = user.id;
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

app.get("/chat/:id", async (req, res) => {
  // Проверка, авторизован ли пользователь

  if (req.session.userid) {
    try {
      const chatId = req.params.id;
      const userId = req.session.userid;
      const chat = await Chat.findById(chatId);
      if (chat) {
        console.log("exist");
        // Проверка, является ли текущий пользователь участником чата
        const isParticipant = chat.participants.includes(userId);

        if (isParticipant) {
          // Получение сообщений из выбранного чата
          const messages = await Message.find({ chat: chatId });

          const user = await User.findOne({ _id: userId });
          const userName = user.Name;
          console.log(userName);
          // Передача сообщений на страницу messages.ejs
          res.render("chat", { messages, userId, userName });
        } else {
          res.redirect("/");
        }
      } else {
        console.log("notexist");
        const currentUser = await User.findById(req.session.userid);
        const participant = await User.findById(chatId);

        if (currentUser && participant) {
          const existingChat = await Chat.findOne({
            participants: { $all: [currentUser._id, participant._id] },
          });

          if (existingChat) {
            // Редирект на страницу чата с найденным идентификатором
            res.redirect(`/chat/${existingChat._id}`);
            return;
          }
        }
        // Создание нового чата
        const newChat = new Chat({
          participants: [currentUser._id, participant._id],
        });
        await newChat.save();

        // Редирект на страницу нового чата
        res.redirect(`/chat/${newChat._id}`);
      }
    } catch (error) {
      console.error(error);
    }
  } else {
    res.redirect("/");
  }
});

app.get("/friends", async function (req, res) {
  if (req.session.userid) {
    try {
      const userId = req.session.userid;

      // Поиск записи о друзьях пользователя в базе данных
      const userFriends = await Friends.findOne({ userId });

      if (userFriends) {
        const friendIds = userFriends.friends;

        // Извлечение данных о друзьях из коллекции users
        const friendsData = await User.find(
          { _id: { $in: friendIds } },
          "Name"
        );

        // Создание массива объектов с данными о друзьях (id и имя)
        const friends = friendsData.map((friend) => ({
          id: friend._id,
          name: friend.Name,
        }));

        res.render("friends", { friends });
      } else {
        res.render("friends", { friends: [] });
      }
    } catch (error) {
      console.error("Ошибка при получении списка друзей:", error);
      res.render("error");
    }
  } else {
    res.render("login", {
      error: "",
      Email: "",
    });
  }
});

app.post("/add-friend/:friendId", function (req, res) {
  // Извлечение идентификатора друга из параметров маршрута
  const friendId = req.params.friendId;
  console.log(friendId + " " + req.session.userid);
  addFriends(req.session.userid, friendId);
});

app.post("/delete-friend/:friendId", async function (req, res) {
  try {
    // Извлечение идентификатора друга из параметров маршрута
    const friendId = req.params.friendId;
    const userId = req.session.userid;

    // Поиск записей о друзьях для текущего пользователя и друга
    const userFriends = await Friends.findOne({ userId: userId });
    const friendFriends = await Friends.findOne({ userId: friendId });

    // Проверка, существуют ли записи о друзьях для текущего пользователя и друга
    if (userFriends && friendFriends) {
      // Удаление друга из списков друзей
      userFriends.friends.pull(friendId);
      friendFriends.friends.pull(userId);

      // Сохранение изменений
      await userFriends.save();
      await friendFriends.save();

      console.log("Друг успешно удален из списка друзей.");

      res.status(200).send("Друг успешно удален из списка друзей.");
    } else {
      console.log("Записи о друзьях не найдены.");

      res.status(404).send("Записи о друзьях не найдены.");
    }
  } catch (error) {
    console.error("Ошибка при удалении друга:", error);
    res.status(500).send("Ошибка при удалении друга.");
  }
});

app.get("/registration", function (req, res) {
  res.render("registration", {
    error: "",
    Name: "",
    Email: "",
  });
});
app.get("/chatroom", function (req, res) {
  res.render("chat-room");
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

async function addFriends(user1Id, user2Id) {
  try {
    if ((!user1Id && !user2Id) || user1Id == user2Id) {
      return;
    }
    // Проверка, существует ли запись о друзьях для первого пользователя
    let user1Friends = await Friends.findOne({ userId: user1Id });
    if (!user1Friends) {
      // Создание новой записи о друзьях для первого пользователя, если она не существует
      user1Friends = new Friends({ userId: user1Id });
      await user1Friends.save();
    }

    // Проверка, существует ли запись о друзьях для второго пользователя
    let user2Friends = await Friends.findOne({ userId: user2Id });
    if (!user2Friends) {
      // Создание новой записи о друзьях для второго пользователя, если она не существует
      user2Friends = new Friends({ userId: user2Id });
      await user2Friends.save();
    }
    // Проверка наличия заявки от user2 к user1
    if (
      user1Friends.friendRequestsReceived.includes(user2Id) &&
      !user1Friends.friends.includes(user2Id)
    ) {
      // Удаление заявки от user2 к user1
      user1Friends.friendRequestsReceived.pull(user2Id);
      user2Friends.friendRequestsSent.pull(user1Id);

      // Добавление пользователей друг к другу в списки друзей
      user1Friends.friends.push(user2Id);
      user2Friends.friends.push(user1Id);

      console.log(
        "Заявка принята. Пользователи успешно добавлены в друзья друг другу."
      );
    } else if (!user2Friends.friendRequestsReceived.includes(user1Id)) {
      // Добавление заявки от user1 к user2
      user1Friends.friendRequestsSent.push(user2Id);
      user2Friends.friendRequestsReceived.push(user1Id);

      console.log("Заявка успешно отправлена.");
    }

    // Сохранение изменений
    await user1Friends.save();
    await user2Friends.save();

    console.log("Пользователи успешно добавлены в друзья друг другу.");
  } catch (error) {
    console.error("Ошибка при добавлении пользователей в друзья:", error);
  }
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log("listening on *:" + PORT);
});

const getSessionFromDatabase = async (userId) => {
  try {
    const session = await Session.findOne({ userId });
    return session;
  } catch (error) {
    console.error("Error retrieving session from database:", error);
    return null;
  }
};

users = [];
connections = [];
const activeSessions = {};

io.on("connection", function (socket) {
  console.log("Успешное соединение");
  const userId = socket.request.session.userid;
  activeSessions[userId] = socket.id;
  console.log(activeSessions);
  connections.push(socket);

  console.log("User ID:", socket.request.session.userid);

  console.log("connected to socket");
  socket.on("disconnect", function (reason) {
    console.log("User 1 disconnected because " + reason);
    connections.splice(connections.indexOf(socket), 1);
    // Удаление пользователя из хранилища
    delete activeSessions[userId];
  });
  socket.on("getRequests", async function () {
    try {
      const userId = socket.request.session.userid;
      console.log(userId);
      const requests = await Friends.find(
        { userId: userId },
        { friendRequestsReceived: 1 }
      );

      const friendRequests = [];

      for (const request of requests) {
        const requesterIds = request.friendRequestsReceived;

        const requesterNames = await User.find(
          { _id: { $in: requesterIds } },
          { Name: 1 }
        );

        const names = requesterNames.map((requester) => ({
          id: requester.id,
          name: requester.Name,
        }));

        friendRequests.push(...names);
      }

      friendRequests.forEach((request) => {
        console.log(request);
      });

      socket.emit("friendRequests", friendRequests);
    } catch (error) {
      console.error("Ошибка при получении заявок в друзья:", error);
    }
  });
  socket.on("getSentRequests", async function () {
    try {
      const userId = socket.request.session.userid;
      console.log(userId);
      const requests = await Friends.find(
        { userId: userId },
        { friendRequestsSent: 1 }
      );

      const friendRequests = [];

      for (const request of requests) {
        const requesterIds = request.friendRequestsSent;

        const requesterNames = await User.find(
          { _id: { $in: requesterIds } },
          { Name: 1 }
        );

        const names = requesterNames.map((requester) => ({
          id: requester.id,
          name: requester.Name,
        }));

        friendRequests.push(...names);
      }

      friendRequests.forEach((request) => {
        console.log(request);
      });

      socket.emit("friendRequestsSent", friendRequests);
    } catch (error) {
      console.error("Ошибка при получении заявок в друзья:", error);
    }
  });
  // Обработка события отправки сообщения
  socket.on("chatMessage", async (message) => {
    const newMessage = new Message({
      text: message.message,
      senderId: message.userId,
      senderName: message.userName,
      chat: message.chatId,
    });
    console.log("test " + message.userId);
    // Сохраните сообщение в базу данных
    await newMessage.save().catch((error) => {
      console.error(error);
    });
    console.log("posting...");
    io.to(message.chatId).emit("message", message);
    // Найти чат в базе данных по chatId
    const chat = await Chat.findOne({ _id: message.chatId }).exec();

    if (chat) {
      // Получить список участников чата
      const participants = chat.participants;
      console.log("notifying...");
      participants.forEach((participantId) => {
        if (participantId !== message.userId) {
          const socketId = activeSessions[participantId];

          if (socketId) {
            io.to(socketId).emit("notification", message);
            console.log("Notifying user..." + participantId);
          }
        }
      });
    }
  });

  // Обработка события подключения к комнате
  socket.on("joinRoom", (chatId) => {
    // Присоединение клиента к комнате
    socket.join(chatId);
    console.log("joined room " + chatId);
  });

  socket.on("searchUser", async (name) => {
    try {
      // Поиск пользователей с именами, содержащими введенное имя
      const users = await User.find({ Name: { $regex: name, $options: "i" } });

      // Формирование массива объектов с именами и идентификаторами найденных пользователей
      const userResults = users.map((user) => ({
        id: user._id,
        name: user.Name,
      }));
      userResults.forEach((userName) => {
        console.log(userName);
      });
      // Отправка массива результатов обратно клиенту
      socket.emit("searchResult", userResults);
    } catch (error) {
      console.error("Ошибка при поиске друга:", error);
      // Отправка сообщения об ошибке обратно клиенту
      socket.emit("searchError", "Ошибка при поиске друга");
    }
  });
});
