var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var config = require('./config/config');
var klaw = require('klaw-sync');
var rimraf = require('rimraf');
var splitFile = require('split-file');
var logger = require('./utils/logger').logger;

app.use(bodyParser.json());
app.use(cors());

var clients = {}, fileIndex = 0, filePartIndex = 0;

io.on(config.connection, (socket) => {
  socket.on('clientName', (message, callback) => {
    logger.info(message.clientName + '(' + message.clientId + ')' + ' client has connected');
    clients[message.clientId] = socket;
    callback(true);
  });
  socket.on(config.disconnect, (listener, val) => {
    logger.info("User was disconnected " + listener);
  });

  socket.on(config.shipReadyToSend, (value, callback) => {
    if (value.ready === true) {
      setTimeout(() => {
        callback(true);
      }, 1000)
    }
  })

  socket.on(config.shipReadyToReceive, async (value, callback) => {
    await directoryExists(config.communicationDirectory + value.clientId)
    if (value.ready === true) {
      readDirectory(config.filesToClient, config.communicationDirectory + value.clientId, value.clientId);
      setInterval(() => {
        readDirectory(config.filesToClient, config.communicationDirectory + value.clientId, value.clientId);
      }, 30000);
    }
  })

  socket.on(config.filesFromClient, async (message, callback) => {
    var fileName = message.fileName;
    var fileContent = new Buffer(message.fileContent);
    var destinationId = message.destinationId;
    try {
      await directoryExists(config.communicationDirectory);
      await directoryExists(config.communicationDirectory + destinationId);
      fs.writeFileSync(config.communicationDirectory + destinationId + '\\' + fileName, fileContent);
      logger.info("Received File " + fileName + " vessel " + destinationId);
    } catch (error) {
      console.log('error: ', error);
    }
    callback(config.server + " has received " + message.fileName);
  });
});

function readDirectory(nspName, folderPath, clientId) {
  const files = klaw(folderPath, { nodir: true });
  fileIndex = 0;
  if (files.length !== 0)
    transportFile(nspName, files, files.length, clientId);
}

async function transportFile(nspName, files, fileCount, clientId) {
  var url = files[fileIndex].path;
  var folderArr = url.split('\\');
  var fileName = folderArr[folderArr.length - 1];
  try {
    fs.exists(url, (exists) => {
      if (exists) {
        logger.info("Sending File - " + fileName);
        var buff = fs.readFileSync(url);
        var data = new Buffer(buff);
        clients[clientId].emit(nspName, { fileName: fileName, fileContent: data }, (value) => {
          logger.info(value)
          fs.unlink(url, (err) => {
            if (!err) {
              if (fileIndex < fileCount - 1) {
                setTimeout(() => {
                  fileIndex++;
                  transportFile(nspName, files, files.length, clientId);
                }, 1000)
              }
            } else {
              logger.error(err);
            }
          })
        })
      }
    })
  } catch (error) {
    console.log('error: ', error);
  }
}

async function directoryExists(folderPath) {
  try {
    if (!fs.existsSync(folderPath))
      fs.mkdirSync(folderPath);
  } catch (error) {
    console.log('error: ', error);
  }

}

function deleteFolder(folderPath) {
  try {
    rimraf(folderPath, function (err) {
      if (err) {
        console.log('err: ', err);
      } else {
        // console.log("Folder Deleted ", new Date().toLocaleString());
      }
    })
  } catch (error) {
    console.log('error: ', error);
  }
}


app.get('/', (req, res) => {
  readDirectory('SPSHORE/VESSEL1', __dirname + '\\file\\');
  res.send("Web Sockets");
})

server.listen(7500, () => {
  console.log("Server is up on port 7500");
});