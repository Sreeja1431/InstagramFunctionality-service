const MongoClient = require("mongodb").MongoClient;
const config = require("./config.json");
const dbURL1 = config.mongoURI_filePath1;
const dbURL2 = config.mongoURI_filePath2;
const dbURL3 = config.mongoURI_filePath3;
const dbURL4 = config.mongoURI_filePath4;
const usersDB = config.mongoURI_usersDB;

function connect(url) {
  return MongoClient.connect(url,{ useUnifiedTopology: true }).then((client) => client.db());
}

const connectDB = async () => {
  try {
    let databases = await Promise.all([
      connect(dbURL1),
      connect(dbURL2),
      connect(dbURL3),
      connect(dbURL4),
      connect(usersDB),
    ]);
    return {
      filePath1: databases[0],
      filePath2: databases[1],
      filePath3: databases[2],
      filePath4: databases[3],
      users: databases[4],
    };
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
