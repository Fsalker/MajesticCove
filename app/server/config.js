// ================================================================ //
//                                                                  //
//      Configure these values so as to suit your needs.            //
//                                                                  //
// ================================================================ //

var fs = require("fs")

var HTML_RESPONSES = []
HTML_RESPONSES[200] = "<h1>OK</h1>"
HTML_RESPONSES[400] = "<h1>Error 400 - Bad Request</h1><p>Your request could not be processed.</p>"
HTML_RESPONSES[401] = "<h1>Error 401 - Unauthorised</h1><p>Authentification has failed.</p>"
HTML_RESPONSES[403] = "<h1>Error 403 - Forbidden</h1><p>You do not have the permission to receive an answer to this request.</p>"
HTML_RESPONSES[404] = "<h1>Error 404 - Not Found</h1><p>Page was not found.</p>"
HTML_RESPONSES[409] = "<h1>Error 409 - Conflict</h1><p>Your request causes a conflict with the server or the database.</p>"
//HTML_RESPONSES[500] = "<h1>Error 500 - Internal Server Error</h1><p>An unexpected internal error has occurred while handling your request.</p>"
HTML_RESPONSES[500] = "Error 500 has occurred."

module.exports = {
    VIEWS_PATH: "./app/views/",
    HTML_RESPONSES: HTML_RESPONSES,
    databaseURL: "mongodb://localhost:27017/MajesticCoveDB",
    log: function(msg){
        var logFile = fs.createWriteStream("log.txt", {flags: "a"})
        d = new Date()
        dateStr = "[" + d.getFullYear() + "/" + ("0" + d.getMonth()).slice(-2) + "/" +  ("0" + d.getDate()).slice(-2) + " - "+("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2) + "] "
        logFile.write(dateStr+msg+"\n")
        console.log(msg);
        logFile.close()
    },
    ID_STRING_LENGTH: 24
}