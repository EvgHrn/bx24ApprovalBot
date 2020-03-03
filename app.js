var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser = require("body-parser");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req, res, next) => {
  if (req.body.event) {
    let result;
    // const configs = Db.getConfigs();
    switch (req.body.event) {
      case "ONAPPINSTALL":
        console.log("ONAPPINSTALL event with body: ", req.body);
        // register new bot
        result = await bitrix.registerBotAndCommands(
          "Согласование",
          "2020-03-03",
          req.body["auth"]["application_token"],
          req.body["auth"],
        );
        console.log("Register bot responese: ", result);
        break;
      case "ONIMBOTMESSAGEADD":
        // check the event - authorize this event or not
        if (!bitrix.checkAuth(req.body["auth"]["application_token"])) {
          console.log("Unauthorize event: ", req.body.event);
          return false;
        }
        console.log("ONIMBOTMESSAGEADD event with body: ", req.body); 
        const message = req.body["data"]["PARAMS"]["MESSAGE"];
        const interestedUsers = bitrix.getInterestedUsers();
        if (interestedUsers.length === 1 && interestedUsers[0] === "1819") {
          console.log("Interested group error. Use only 1819");
          result = await bitrix.sendMessage(
            req.body["data"]["PARAMS"]["FROM_USER_ID"],
            `Ошибка группы пользователей`,
            req.body["auth"],
          );
        }
        //236654 Ижевск Иван Святогоров сублимационная футболка Гэгэкси
        const orderNumber = message.match(/^\d{3}\s?\d{3}(?=\s)/gm)[0];
        break;
      default:
        break;
    }
  } else {
    console.log("New unidentified request: ", req.body);
  }
  res.sendStatus(200);
});

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;