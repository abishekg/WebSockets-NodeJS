var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io-client');
var socket = io.connect('ws://172.22.25.84:7500');
var config = require('./config/config');
var klaw = require('klaw-sync');
var rimraf = require('rimraf');
var splitFile = require('split-file');
var sizeOf = require('object-sizeof');
var chokidar = require('chokidar');
var logger = require('./utils/logger').logger;

app.use(bodyParser.json());
app.use(cors());

var fileIndex = 0;

socket.on(config.connect, () => {
  console.log("Connected to Server");
  // logger.info("Vessel 1 Connected to Shore");
  socket.emit('clientName', {
    clientId: config.clientId,
    clientName: "Vessel"
  }, (value) => {
    console.log(value);
  })
  socket.emit(config.shipReadyToSend, {
    ready: config.shipReadyToSendValue
  }, (value) => {
    if (true === value) {
      readDirectory(config.filesFromClient, config.sendDirectory);
      setInterval(() => {
        readDirectory(config.filesFromClient, config.sendDirectory);
      }, 30000)
    }
  });

  // setInterval(() => {
  socket.emit(config.shipReadyToReceive, {
    ready: config.shipReadyToReceiveValue,
    clientId: config.clientId
  });
  // }, 30000)

  socket.on(config.disconnect, () => {
    console.log("Socket has been disconnected", new Date().toLocaleString());
  });
});

function readDirectory(nspName, folderPath) {
  const files = klaw(folderPath, {
    nodir: true
  });
  fileIndex = 0;
  if (files.length !== 0)
    transportFile(nspName, files, files.length);
}

async function transportFile(nspName, files, fileCount) {
  var url = files[fileIndex].path;
  var processed = '\\processing';
  var folderArr = url.split('\\');
  var fileName = folderArr[folderArr.length - 1];
  try {
    // logger.info(docs.length + " split(s) for file " + fileName);
    fs.exists(url, (exists) => {
      if (exists) {
        var data = fs.readFileSync(url);
        var buff = new Buffer(data);
        socket.emit(nspName, {
          fileName: fileName,
          fileContent: buff,
          destinationId: config.vessel1
        }, value => {
          logger.info(value);
          fs.unlink(url, (err) => {
            if (err) {
              logger.error(err);
            } else {
              if (fileIndex < fileCount - 1) {
                setTimeout(() => {
                  fileIndex++;
                  transportFile(nspName, files, fileCount);
                }, 1000)
              }
            }

          })
        });
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
    fs.writeFileSync(config.receiveDirectory + fileName, fileContent);
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