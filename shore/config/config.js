module.exports = {
    shipReadyToSendValue: true,
    shipReadyToReceiveValue: true,
    VES1: "/VESSEL1",
    VES2: "/VESSEL2",
    SHORE: "SPSHORE",
    SHIP: "SPSHIP",
    nspVes1: 'vessel1',
    nspVes2: 'vessel2',
    chunkSize: 2048000,
    connect: 'connect',
    clientId: 10001,
    shipReadyToSend: 'shipReadyToSend',
    shipReadyToReceive: 'shipReadyToReceive',
    port: 8050,
    url:'<insert server IP with its port>',
    disconnect: 'disconnect',
    filesFromClient: 'filesFromClient',
    filesToClient: 'filesToClient',
    vessel2: 10002,
    vessel3: 10003,
    vessel4: 10004,
    communicationDirectory: __dirname + '\\communication\\',
    sendDirectory: 'sendFiles',
    receiveDirectory: '\\receivedFiles\\',
}