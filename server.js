var MongoClient = require("mongodb").MongoClient;

var http = require("http")
var fs = require("fs")

const modulesPath = "./app/server/"
var cfg = require(modulesPath+"config.js")
var webHandler = require(modulesPath+"webHandler.js")
var throws = require(modulesPath+"throwFuncs.js")
var dbSchema = require(modulesPath+"dbSchema.js")

// [Server handler]
function serverHandler(req, res){
    const clientIP = res.socket.remoteAddress;
    const url = req.url;
    var requestedFile = undefined;
    var fileExtension = undefined;

    // Figure out the requested file and its extension
    rightmostItem = req.url.split("/").pop();
    if(rightmostItem.indexOf(".") == -1) requestedFile = undefined; // Not a file
    else requestedFile = rightmostItem;

    if(requestedFile) fileExtension = requestedFile.split(".").pop();
    
    // Log the request
    cfg.log("Client "+clientIP+" has accessed "+url+", requesting file = "+requestedFile+" with extension "+fileExtension)

    // Handle the request
    if(fileExtension){ // Requesting a .file
        throws.throwServedFile(res, requestedFile)
        /*const ALLOWED_REQUEST_EXTENSIONS = ["ico", "css", "html", "gif"]
        if(ALLOWED_REQUEST_EXTENSIONS.indexOf(fileExtension) == -1) // Not an allowed file extension
            throws.throwResponse(res, 404)
        else{ // Serve the file
            throws.throwServedFile(res, requestedFile)*/
    }
    else { // Requesting something else than a file
        switch (url){
            case "/":
                webHandler.defaultHandler(req, res, dbo)
                break;
            case "/login":
                webHandler.loginHandler(req, res, dbo)
                break;
            case "/register":
                webHandler.registerHandler(req, res, dbo)
                break;
            case "/logout":
                webHandler.logoutHandler(req, res, dbo)
                break;
            case "/addDefinition":
                webHandler.addDefinitionHandler(req, res, dbo)
                break;
            case "/showMyDefinitions":
                webHandler.showMyDefinitionsHandler(req, res, dbo)
                break;
            case "/deleteMyDefinition":
                webHandler.deleteMyDefinitionHandler(req, res, dbo)
                break;
            case "/getWordDefinitions":
                webHandler.getWordDefinitionsHandler(req, res, dbo)
                break;
            case "/voteDefinition":
                webHandler.voteDefinitionHandler(req, res, dbo)
                break;
            default:
                throws.throwResponse(res, 404);
                break;
        }
    }
}

// [Database connection] aka Main handler
MongoClient.connect(cfg.databaseURL, {useNewUrlParser: true}, function(err, client){
    if(err) throw err;

    /// =====================================[ Create Database ]=====================================
    dbo = client.db("MajesticCoveDB")
    dbSchema.createDatabase(dbo);

    /// =====================================[ Start Web Server ]=====================================
    var server = http.createServer(serverHandler);
    server.listen(80);
})