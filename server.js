var MongoClient = require("mongodb").MongoClient;

var http = require("http")
let https  = require("https")
let fs = require("fs")

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
    cfg.log("Client "+clientIP+" has accessed "+url+", requesting file \""+requestedFile+"\" with extension \""+fileExtension+"\"")

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
                //webHandler.defaultHandler(req, res, dbo)
                throws.throwServedFile(res, "main.html")
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
            case "/getRandomWords":
                webHandler.getRandomWordsHandler(req, res, dbo)
                break;
            default:
                throws.throwResponse(res, 404);
                break;
        }
    }
}

// [Database connection] aka Main handler
console.log("Connecting to DB...")
MongoClient.connect(cfg.databaseURL, {useNewUrlParser: true}, function(err, client){
    if(err) throw err;
    console.log("Connected to DB!")

    /// =====================================[ Create Database ]=====================================
    dbo = client.db("MajesticCoveDB")
    dbSchema.createDatabase(dbo);

    /// =====================================[ Start Web Server ]=====================================
    const PORT = 4000
    let server
    let HTTPS_ENABLED = false
    let http_options

    try{
        const CERTIFICATE_LOCATION = "/etc/letsencrypt/live/andrei-puiu.dev"
        http_options = {
            key: fs.readFileSync(`${CERTIFICATE_LOCATION}/privkey.pem`),
            cert: fs.readFileSync(`${CERTIFICATE_LOCATION}/cert.pem`),
        }
        HTTPS_ENABLED = true
    }catch(e){
        console.log("Failed to acquire HTTPS certificate")
        console.log(e)
    }

    if(HTTPS_ENABLED){
        server = https.createServer(http_options, serverHandler)
        server.listen(PORT)
        console.log(`HTTPS server is running on PORT ${PORT}...`)
    } else {
        http.createServer(serverHandler);
        server = http.createServer(serverHandler)
        server.listen(PORT)
        console.log(`HTTP server is running on PORT ${PORT}...`)
    }

    console.log("Listening on port "+PORT)
})
