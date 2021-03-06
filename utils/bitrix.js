const querystring = require("qs");
const fetch = require("node-fetch");
const Db = require("./db");

require("dotenv").config();

class Bitrix {
  constructor() {
    // const interestedUsers = ["1819", "1600", "3", "1480", "1588"];
    // const interestedUsers = ["1819"];
		this.interestedUsers = Db.getInterestedUsers();
		if (!this.interestedUsers) {
			this.interestedUsers = ["1819"]; 
			Db.addInterestedUser("1819");
		}
    this.configs = Db.getConfigs();
  }

  getInterestedUsers = () => {
    if (this.interestedUsers) {
      return this.interestedUsers;
    } else {
      //TODO send message about getInterestedUsers error
      return ["1819"];
    }
  };

  addInterestedUser = userIdStr => {
    const result = Db.addInterestedUser(userIdStr);
    if (result) {
      //TODO send message with new interested Users
      this.interestedUsers = result;
    } else {
      //TODO send message about addInterestedUser error
    }
  };

  deleteInterestedUser = userIdStr => {
    const result = Db.deleteInterestedUser(userIdStr);
    if (result) {
      this.interestedUsers = result;
      //TODO send message with new interested Users
    } else {
      //TODO send message about deleteInterestedUser error
    }
  };

  getFileUrl = async (fileId, auth) => {
    const result = await this.restCommand(
      "disk.file.get",
      {
        id: fileId
      },
      auth
    );
    return result["result"]["DETAIL_URL"];
  };

  sendMessage = async (userId, msg, auth, attach = []) => {
    const result = await this.restCommand(
      "imbot.message.add",
      {
        DIALOG_ID: userId,
        MESSAGE: msg,
      },
      auth,
      attach
    );
    if (result) {
      console.log("Sending message result: ", result);
    } else {
      console.log("Sending message error");
    }
  };

  getFileVersion = async (fileId, auth) => {
    const fileInfo = await this.restCommand(
      "disk.file.get",
      {
        id: fileId
      },
      auth);
    if("result" in fileInfo) {
      return fileInfo["result"]["GLOBAL_CONTENT_VERSION"];
    } else {
      return false;
    }
  }

  saveApproveFiles = async (fileId, city, orderNumber, product, auth) => {

    //Get city folders
    let cityFoldersArr = await this.restCommand(
      "disk.folder.getchildren",
      {
        id: 236942
      },
      auth
    );
    cityFoldersArr = cityFoldersArr["result"];

    //Check if city folder exist
    const isCityFolderExist = cityFoldersArr.some((cityFolderObj) => cityFolderObj["NAME"] === city);

    //Getting city folder id
    let cityFolderId;
    if(isCityFolderExist) {
      cityFolderId = cityFoldersArr.find((cityFolderObj) => cityFolderObj["NAME"] === city)["ID"];
    } else {
      //Create city folder
      const cityFolderIdResult = await this.restCommand(
        "disk.folder.addsubfolder",
        {
          id: 236942,
          data: {
            NAME: city
          }
        },
        auth
      );
      cityFolderId = cityFolderIdResult["result"]["ID"];
    }

    //Getting order folder id
    let orderFolderId = 236942;
    if(!isCityFolderExist){
      const orderFolderIdResponse = await this.restCommand(
        "disk.folder.addsubfolder",
        {
          id: cityFolderId,
          data: {
            NAME: `${orderNumber} ${product}`
          }
        },
        auth
      );
      orderFolderId = orderFolderIdResponse["result"]["ID"];
    } else {
      //Check if order folder exist
      const ordersFoldersArrResponse =  await this.restCommand(
        "disk.folder.getchildren",
        {
          id: cityFolderId
        },
        auth
      );
      const ordersFoldersArr = ordersFoldersArrResponse["result"];
      const isOrderFolderExist = ordersFoldersArr.some((orderFolderObj) => orderFolderObj["NAME"] ===  `${orderNumber} ${product}`);
      if(!isOrderFolderExist) {
        //Create order folder
        const orderFolderIdResponse = await this.restCommand(
          "disk.folder.addsubfolder",
          {
            id: cityFolderId,
            data: {
              NAME: `${orderNumber} ${product}`
            }
          },
          auth
        );
        orderFolderId = orderFolderIdResponse["result"]["ID"];
      } else {
        //Getting existing order folder id
        orderFolderId = ordersFoldersArr.find((orderFolderObj) => orderFolderObj["NAME"] ===  `${orderNumber} ${product}`)["ID"];
      }
    }

    //Save files
    const result = await this.restCommand(
      "disk.file.copyto",
      {
        id: fileId,
        targetFolderId: orderFolderId,
      },
      auth
    );
    if ("result" in result) {
      // console.log("Saving file result: ", result);
      return result;
    } else {
      return false;
    }
  };

  registerBotAndCommands = async (name, birthday, token, auth) => {
    let result = await this.restCommand(
      "imbot.register",
      {
        CODE: name,
        TYPE: "H",
        EVENT_MESSAGE_ADD: process.env.SERVER_HOST,
        EVENT_WELCOME_MESSAGE: process.env.SERVER_HOST,
        EVENT_BOT_DELETE: process.env.SERVER_HOST,
        PROPERTIES: {
          NAME: name,
          COLOR: "GREEN",
          EMAIL: "evg.hrn@gmail.com",
          PERSONAL_BIRTHDAY: birthday,
          WORK_POSITION: name,
          PERSONAL_WWW: "http://bitrix24.com",
          PERSONAL_GENDER: "M",
          // "PERSONAL_PHOTO": avatar,
        },
      },
      auth
    );
    const botId = result["result"];
    // result = await this.restCommand(
    //   "imbot.command.register",
    //   {
    //     BOT_ID: botId,
    //     COMMAND: "masssend",
    //     COMMON: "Y",
    //     HIDDEN: "N",
    //     EXTRANET_SUPPORT: "N",
    //     LANG: [
    //       {
    //         LANGUAGE_ID: "ru",
    //         TITLE:
    //           "Рассылка подразделению. Нельзя использовать тире в сообщении и названии подразделения",
    //         PARAMS: "Подразделение-Сообщение",
    //       },
    //     ],
    //     EVENT_COMMAND_ADD: process.env.SERVER_HOST,
    //   },
    //   auth,
    // );
    // const commandMassSend = result["result"];

    // result = await this.restCommand(
    //   "imbot.command.register",
    //   {
    //     BOT_ID: botId,
    //     COMMAND: "addsupportuser",
    //     COMMON: "Y",
    //     HIDDEN: "N",
    //     EXTRANET_SUPPORT: "N",
    //     LANG: [
    //       {
    //         LANGUAGE_ID: "ru",
    //         TITLE: "Добавить пользователя в группу поддержки",
    //         PARAMS: "id пользователя",
    //       },
    //     ],
    //     EVENT_COMMAND_ADD: process.env.SERVER_HOST,
    //   },
    //   auth,
    // );

    // const commandAddSupportUser = result["result"];

    // result = await this.restCommand(
    //   "imbot.command.register",
    //   {
    //     BOT_ID: botId,
    //     COMMAND: "deletesupportuser",
    //     COMMON: "Y",
    //     HIDDEN: "N",
    //     EXTRANET_SUPPORT: "N",
    //     LANG: [
    //       {
    //         LANGUAGE_ID: "ru",
    //         TITLE: "Удалить пользователя из группы поддержки",
    //         PARAMS: "id пользователя",
    //       },
    //     ],
    //     EVENT_COMMAND_ADD: process.env.SERVER_HOST,
    //   },
    //   auth,
    // );

    // const commandDeleteSupportUser = result["result"];

    // save params
    let newConfig = {};
    newConfig[token] = {
      BOT_ID: botId,
      // COMMAND_MASSSEND: commandMassSend,
      // COMMAND_ADDSUPPORTUSER: commandAddSupportUser,
      // COMMAND_DELETESUPPORTUSER: commandDeleteSupportUser,
      AUTH: auth,
    };
    Db.saveConfig(newConfig);
  };

  checkAuth = token => {
    const configs = Db.getConfigs();
    console.log("Got new configs: ", configs);
    return configs.find(configObj => Object.keys(configObj).includes(token));
  };

  searchUsersByDepartment = async (departmentToSearch, auth) => {
    let result;
    result = await this.restCommand(
      "im.search.user.list",
      { FIND: departmentToSearch },
      auth
    );
    return result.result;
  };
  
  findUserByFullName = async (userStr, auth) => {
    const wordsArr = userStr.split(" ");
    if(wordsArr.length !== 2) {
      console.log("findUserByFullName: array length error");
      return false;
    }
    const word1 = wordsArr[0];
    const word2 = wordsArr[1];
    const resultArr = await this.restCommand(
      'im.search.user.list',
      { 'FIND': word1 },
      auth
    );
    console.log("findUserByFullName result1: ", resultArr);
    if(!("result" in resultArr)) {
      console.log("findUserByFullName: getting user list 1 error");
      return false;
    }
    const resultKeysArr = Object.keys(resultArr["result"]).filter((userKey) => {
      return (resultArr["result"][userKey]["first_name"] === word2 || resultArr["result"][userKey]["last_name"] === word2)
    });
    if(resultKeysArr.length !== 1) {
      console.log("findUserByFullName: getting user list 2 error");
      return false;
    }
    return resultArr["result"][resultKeysArr[0]]["id"];
  };
	
  commandAnswer = async (commandId, commandMsg, msg, attach, auth) => {
      const result = await this.restCommand(
    "imbot.command.answer",
    {
      COMMAND_ID: commandId,
      MESSAGE_ID: commandMsg,
      MESSAGE: msg,
      ATTACH: attach,
    },
    auth
  );
      return result;
  }

  restCommand = async (method, params = {}, auth = {}, attach = [], authRefresh = true) => {
    const queryUrl = `${auth["client_endpoint"]}${method}`;
    const queryData = querystring.stringify({
      ...params,
      auth: auth["access_token"],
      attach
    });

    let result;
    try {
      const response = await fetch(`${queryUrl}/?${queryData}`);
      result = await response.json();
      // console.log("restCommand response: ", result);
    } catch (err) {
      console.log("restCommand fetch error: ", err);
      return false;
    }

    if (
      authRefresh &&
      result["error"] &&
      (result["error"]["expired_token"] || result["error"]["invalid_token"])
    ) {
      auth = await this.restAuth(auth);
      if (auth) {
        result = await this.restCommand(method, params, auth, attach, false);
        console.log("restCommand response w/o auth: ", result);
      }
    }
    return result;
  };

  restAuth = async auth => {
    if (!process.env.BITRIX_CLIENT_ID || !process.env.BITRIX_CLIENT_SECRET) {
      console.log("Error: No env vars");
      return false;
    }

    if (!auth["refresh_token"]) {
      console.log("Error: No refresh_token");
      return false;
    }

    const queryUrl = "https://oauth.bitrix.info/oauth/token/";

    const queryData = querystring.stringify({
      grant_type: "refresh_token",
      client_id: process.env.BITRIX_CLIENT_ID,
      client_secret: process.env.BITRIX_CLIENT_SECRET,
      refresh_token: auth["refresh_token"],
    });

    let result;

    try {
      const response = await fetch(`${queryUrl}?${queryData}`);
      result = await response.json();
      console.log("restAuth response: ", result);
    } catch (err) {
      console.log("Auth fetch error: ", err);
      result = false;
    }

    if (!result["error"]) {
      console.log("restAuth success");
      result["application_token"] = auth["application_token"];
      config[auth["application_token"]]["AUTH"] = result;
      console.log("New config: ", config);
      const savingResult = Db.saveConfig(config);
      if (!savingResult) {
        //TODO send message about savingResult error
      }
    } else {
      console.log("Auth error: ", result);
      result = false;
    }
    return result;
  };
}

module.exports = Bitrix;
