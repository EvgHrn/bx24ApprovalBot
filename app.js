const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require("body-parser");
const Bitrix = require('./utils/bitrix');
const cityArr = require('./utils/city');

const app = express();
const bitrix = new Bitrix();

let state = {
  managerId: null,
  orderNumber: null,
  city: null,
  product: null
};

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
        console.log("ONAPPINSTALL event");
        // register new bot
        result = await bitrix.registerBotAndCommands(
          "Согласование",
          "2020-03-03",
          req.body["auth"]["application_token"],
          req.body["auth"],
        );
        console.log("Register bot result: ", result);
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
        if(message && message !== "") {
          //236654 Ижевск Иван Святогоров сублимационная футболка
          //TODO handle null result 
          const orderNumber = message.match(/^\d{3}\s?\d{3}(?=\s)/gm)[0];
          //TODO handle false result 
          const city = findCity(message);
          console.log('Recognized order number: ', orderNumber);
          console.log('Recognized city: ', city);
          let regex = new RegExp(`(?<=${city}).*$`, "gm");
          //TODO handle null result and errors
          const messageManagerAndProductStr = message.match(regex)[0];
          //TODO handle null result and errors
          const managerStr = messageManagerAndProductStr.trim().match(/^\S*\s*\S*/gm)[0].trim();
          const managerId = await bitrix.findUserByFullName(managerStr, req.body["auth"]);
          console.log('Recognized manager: ', managerStr);
          regex = new RegExp(`(?<=${managerStr}).*`, "gm");
          //TODO handle null result and errors
          const product = messageManagerAndProductStr.trim().match(regex)[0].trim();
          console.log('Recognized product: ', product);
          state = { orderNumber, city, product, managerId };
          console.log("New state: ", state);
          break;
        }
        let attach = [];
        if(req.body["data"]["PARAMS"]["FILES"]) {
          console.log("There are files in message: ", req.body["data"]["PARAMS"]["FILES"]);
          const filesKeys = Object.keys(req.body["data"]["PARAMS"]["FILES"]);
          filesKeys.map(async(fileKey) => {
            //Save files to disk
            const getFolderIdResult = await bitrix.restCommand(
                "im.disk.folder.get",
                {
                  CHAT_ID: req.body["data"]["PARAMS"]["CHAT_ID"]
                },
                req.body["auth"]);
            console.log("Chat folder id: ", getFolderIdResult);
            const getFolderInfoResult = await bitrix.restCommand(
                "disk.folder.get",
                {
                  id: getFolderIdResult["result"]["ID"]
                },
                req.body["auth"]);
            console.log("Chat folder info: ", getFolderInfoResult);
            result = await bitrix.saveApproveFiles(req.body["data"]["PARAMS"]["FILES"][fileKey]["id"],
                state.city,
                state.orderNumber,
                state.product,
                req.body["auth"]);
            //Parse result
            const fileUrl = result["result"]["DETAIL_URL"];
            const fileName = result["result"]["NAME"];
            console.log("File url: ", fileUrl);
            console.log("File name: ", fileName);
            //Add file to attach
            attach.push({ IMAGE: {
              NAME: fileName,
              LINK: fileUrl
            }});
            //Send message with files to manager
            result = await bitrix.sendMessage(
              state.managerId,
              `${req.body["data"]["USER"]["NAME"]} id${req.body["data"]["USER"]["ID"]}: ${state.orderNumber}`,
              req.body["auth"],
              attach
            );
          });
        }
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

const findCity = (str) => {
  const filteredCityArr = cityArr.filter((city) => str.includes(city));
  if(filteredCityArr.length === 1) {
    return filteredCityArr[0];
  } else {
    return false;
  }
};

module.exports = app;
