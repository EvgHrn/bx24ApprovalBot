const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

require("dotenv").config();

const adapter = new FileSync("db.json");
const dblow = low(adapter);

class Db {
  static getInterestedUsers = () => {
    try {
      dblow.read();
      const interestedUsers = dblow.getState().interestedUsers;
      if (interestedUsers === undefined) return false;
      return interestedUsers;
    } catch (err) {
      return false;
    }
	};
	
  static addInterestedUser = (user) => {
    if (!user) return false;
    let interestedUsers;
    try {
      dblow.read();
      interestedUsers = dblow.getState().interestedUsers;
      if (interestedUsers === undefined) {
        interestedUsers = ["1819"];
      }
      interestedUsers.push(user);
      dblow.set("interestedUsers", interestedUsers).write();
      const savedInterestedUsers = this.getInterestedUsers();
      if (savedInterestedUsers === false) return false;
      return savedInterestedUsers;
    } catch (err) {
      return false;
    }
  };

  static deleteInterestedUser = (user) => {
    if (!user) return false;
    let interestedUsers;
    try {
      dblow.read();
      interestedUsers = dblow.getState().interestedUsers;
      if (interestedUsers === undefined) {
        return false;
      }
      interestedUsers = interestedUsers.filter(
        interestedUser => interestedUser !== user,
      );
      dblow.set("interestedUsers", interestedUsers).write();
      const interestedUsers = this.getInterestedUsers();
      if (savedInterestedUsers === false) return false;
      return savedInterestedUsers;
    } catch (err) {
      return false;
    }
  };

  static saveConfig = config => {
    console.log("Gonna save new config: ", config);
    try {
      dblow
        .get("configs")
        .push(config)
        .write();
      console.log("New config successfully saved");
      return true;
    } catch (err) {
      console.log("Saving config error");
      return false;
    }
  };

	static getConfigs = () => {
		let configs;
		try {
			dblow.read();
      configs = dblow.getState().configs;
      console.log("dblow.getState(): ", dblow.getState());
      // console.log("dblow.getState().configs: ", dblow.getState().configs);
			if (configs === undefined) {
				dblow.set("configs", []).write();
				configs = [];
			}
		} catch (err) {
			console.log("Getting configs from db error: ", err);
			console.log("Reset config");
			dblow.set("configs", []).write();
			configs = [];
		}
		return configs;
	};
}

module.exports = Db;
