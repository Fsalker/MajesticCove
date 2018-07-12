// ================================================================ //
//                                                                  //
//      Configure these values so as to suit your needs.            //
//                                                                  //
// ================================================================ //

var HTML_RESPONSES = []
HTML_RESPONSES[200] = "<h1>OK</h1>"
HTML_RESPONSES[400] = "<h1>Error 400 - Bad Request</h1><p>Your request could not be processed.</p>"
HTML_RESPONSES[401] = "<h1>Error 401 - Unauthorised</h1><p>Authentification has failed.</p>"
HTML_RESPONSES[403] = "<h1>Error 403 - Forbidden</h1><p>You do not have the permission to receive an answer to this request.</p>"
HTML_RESPONSES[404] = "<h1>Error 404 - Not Found</h1><p>Page was not found.</p>"
//HTML_RESPONSES[500] = "<h1>Error 500 - Internal Server Error</h1><p>An unexpected internal error has occurred while handling your request.</p>"
HTML_RESPONSES[500] = "Error 500 has occurred."

module.exports = {
    VIEWS_PATH: "./app/views/",
    HTML_RESPONSES: HTML_RESPONSES,
    databaseURL: "mongodb://localhost:27017/MajesticCoveDB",
    log: function(msg){
        console.log(msg);
    },
    ID_STRING_LENGTH: 24
}