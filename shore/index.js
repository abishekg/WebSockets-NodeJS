var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var fs = require('fs');
var io = require('socket.io-client');
var socket = io.connect('ws://172.22.25.84:7500');
var config = require('./config/config');
var klaw = require('klaw-sync');
var logger = require('./utils/logger').logger;

app.use(bodyParser.json());
app.use(cors());

var fileIndex = 0;

socket.on(config.connect, () => {
  console.log("Connected To Server");
  // logger.info("Vessel 1 Connected to Shore");
  socket.emit('clientName', { clientId: config.clientId, clientName: "Vessel" }, (value) => {
    console.log(value);
  })
  socket.emit(config.shipReadyToSend, { ready: config.shipReadyToSendValue }, (value) => {
    console.log(value);
    if (true === value) {
      const folders = klaw('D:\\Communication\\websockets\\final_socket_client\\communication', { nofile: true });
      folders.forEach(folder => {
        var pathSplit = folder.path.split('\\');
        if (pathSplit[pathSplit.length - 1] === config.sendDirectory) {
          var destinationId = pathSplit[pathSplit.length - 2];
          logger.info(destinationId);
          readDirectory(config.filesFromClient, folder.path, destinationId);
          setInterval(() => {
            readDirectory(config.filesFromClient, folder.path, destinationId);
          }, 30000);
        }
      });
    }
  });

  socket.emit(config.shipReadyToReceive, { ready: config.shipReadyToReceiveValue, clientId: config.clientId });

  socket.on(config.disconnect, (listener) => {
    logger.info("Client Disconnected");
  });
});

function readDirectory(nspName, folderPath, destinationId) {
  const files = klaw(folderPath, { nodir: true });
  fileIndex = 0;
  if (files.length !== 0)
    transportFile(nspName, files, files.length, destinationId);
}

async function transportFile(nspName, files, fileCount, destinationId) {
  var url = files[fileIndex].path;
  var folderArr = url.split('\\');
  var fileName = folderArr[folderArr.length - 1];
  try {
    fs.exists(url, (exists) => {
      if (exists) {
        logger.info("Sending File - " + fileName);
        var data = fs.readFileSync(url);
        var buff = new Buffer(data);
        socket.emit(nspName, { fileName: fileName, fileContent: buff, destinationId: destinationId }, value => {
          logger.info(value)
          fs.unlink(url, (err) => {
            if (!err) {
              if (fileIndex < fileCount - 1) {
                setTimeout(() => {
                  fileIndex++;
                  transportFile(nspName, files, fileCount, destinationId);
                }, 1000)
              }
            }
          });
        })
      }
    })

  } catch (error) {
    console.log('error: ', error);
  }
}

socket.on(config.filesToClient, async (message, callback) => {
  var fileName = message.fileName;
  var fileContent = new Buffer(message.fileContent);
  try {
    // await checkDirectoryExists(config.communicationDirectory + destinationId);
    if (!fs.existsSync(config.receiveDirectory))
      fs.mkdirSync(config.communicationDirectory);
    fs.writeFileSync(config.receiveDirectory + fileName, fileContent);
    logger.info(message.fileName + " has been received");
  } catch (error) {
    console.log('error: ', error);
  }
  callback(config.clientId + " has received " + message.fileName);
});


async function directoryExists(folderPath) {
  try {
    if (!fs.existsSync(folderPath))
      fs.mkdirSync(folderPath);
  } catch (error) {
    console.log('error: ', error);
  }
}

app.listen(config.port, () => {
  logger.info(`Server is up in port ${config.port}`);
})