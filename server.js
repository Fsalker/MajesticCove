//var express = require('express');
//var app = express();
//var bodyParser = require('body-parser');
var MongoClient = require("mongodb").MongoClient;
var mongodbUrl = "mongodb://localhost:27017/MajesticCove";
var crypto = require("crypto")
//var multiparty = require("multiparty")

var http = require("http")
var fs = require("fs")

const VIEWS_PATH = "./public/views/"

var HTML_RESPONSES = []
HTML_RESPONSES[200] = "<h1>OK</h1>"
HTML_RESPONSES[400] = "<h1>Error 400 - Bad Request</h1><p>Your request could not be processed.</p>"
HTML_RESPONSES[401] = "<h1>Error 401 - Unauthorised</h1><p>Authentification has failed.</p>"
HTML_RESPONSES[403] = "<h1>Error 403 - Forbidden</h1><p>You do not have the permission to receive an answer to this request.</p>"
HTML_RESPONSES[404] = "<h1>Error 404 - Not Found</h1><p>Page was not found.</p>"
//HTML_RESPONSES[500] = "<h1>Error 500 - Internal Server Error</h1><p>An unexpected internal error has occurred while handling your request.</p>"
HTML_RESPONSES[500] = "Error 500 has occurred."

function generateKey(){
    var hash = crypto.createHash("sha256"); 
    hash.update(Math.random().toString());
    return hash.digest("hex");
}

function createDatabase(dbo){
    //dbo.dropCollection("users", function(){
        dbo.createCollection("users", {
            validator:{
                $jsonSchema: {
                    bsonType: "object",
                    required: ["username", "password", "age"],
                    properties: {
                        username: {
                            bsonType: "string",
                            description: "username here"
                        },
                        password: {
                            bsonType: "string",
                            description: "password here"
                        },
                        age: {
                            bsonType: "int",
                            description: "age here"
                        },
                        ssid: {
                            bsonType: "string",
                            description: "ssid not here. do not toy with this :D"
                        }
                    }
                }
            }
        }, function(err, data){
            dbo.collection("users").createIndex({"username": 1}, {unique: true})
        })
    //})
}

function log(msg){
    console.log(msg);
}

function getPublicFilePath(fileName){
    return VIEWS_PATH + fileName;
}

function throwFavicon(res){
    fs.readFile(getPublicFilePath("favicon.ico"), function(err, data){
        if(err)
            throw500(res);
        else{
            res.writeHead(200, {"content-type": "image/x-icon"})
            res.write(data);
            res.end();
        }
    })
}

function throw500(res){ /// 500 - Internal Server Error
    res.writeHead(500, {"Content-type": "text/html"})
    res.end("<h1>Error 500 - Internal Server Error</h1><p>An unexpected internal error has occurred while handling your request.</p>")
}

function throw403(res){ /// 403 - Forbidden
    res.writeHead(403, {"content-type": "text/html"});
    res.end("<h1>Error 403 - Forbidden</h1><p>You do not have the permission to receive an answer to this request.</p>");
}

function throw404(res){ /// 404 - Not Found
    fs.readFile(getPublicFilePath("404.html"), function(err, data){
        if(err){
            throw500(res);
        }
        else {
            res.writeHead(404, {"content-type": "text/html"})
            res.write(data);
            res.end();
        }
    })
}

function throwResponse(res, statusCode, data){
    if(!HTML_RESPONSES[statusCode]){
        log("Status code "+statusCode+" does not exist!")
        throw500(res);
    }

    res.writeHead(statusCode, {"content-type":"text/html"})
    if(!data){
        res.writeHead(statusCode, {"content-type":"text/html"})
        res.end(HTML_RESPONSES[statusCode])
    }
    else{
        res.end(data)/*
        type = typeof data
        if(type == "string"){
            res.writeHead(statusCode, {"content-type":"text/html"})
            res.end(data)
        }
        else if(type == "object"){
            res.writeHead(statusCode, {"content-type":"application/json"})
            res.end(JSON.stringify(data))
        }
        else {
            log("Data type "+type+" could not be sent back to the client!")
            throw500(res);
        }*/
        
    }
}

function login_1_username(res, dbo, user, pass){
    dbo.collection("users").find({username: user}).toArray(function(err, find_res){
        if(err) {
            log(err)
            throwResponse(res, 500)
        }
        else{
            if(find_res.length > 0) login_2_password(res, dbo, user, pass)
            else throwResponse(res, 401, "Username does not exist!")
        }
    })
}

function login_2_password(res, dbo, user, pass){
    dbo.collection("users").find({username: user, password: pass}).toArray(function(err, find_res){
        if(err) {
            log(err)
            throwResponse(res, 500)
        }
        else{
            if(find_res.length > 0) login_3_ssid(res, dbo, user, pass)
            else throwResponse(res, 401, "Password is incorrect.")
        }
    })
}

function login_3_ssid(res, dbo, user, pass){
    ssid = generateKey()

    findQuery = {username: user}
    updateQuery = {$set: {ssid: ssid}}

    dbo.collection("users").updateMany(findQuery, updateQuery, function(err, update_res){
        if(err) {
            log(err)
            throwResponse(res, 500)
        }
        else
            throwResponse(res, 200, JSON.stringify({ssid: ssid}))
    })
}

function register_1_checkUser(res, dbo, user, pass, age){
    dbo.collection("users").find({username: user}).toArray(function(err, find_res){
        if(err){
            log(err)
            throwResponse(res, 500)
        }
        else {
            if(find_res.length > 0)
                throwResponse(res, 401, "Username is taken!")
            else
                register_2_insert(res, dbo, user, pass, age)
        }

    })
}

function register_2_insert(res, dbo, user, pass, age){
    ssid = generateKey()
    dbo.collection("users").insert({username: user, password: pass, age: age, ssid: ssid}, function(err, insert_res){
        if(err){
            log(err)
            throwResponse(res, 500)
        }
        else
            throwResponse(res, 200, JSON.stringify({ssid: ssid}))
    })
}

function logout(dbo, ssid){
    dbo.collection("users").updateMany({ssid: ssid}, {$set: {ssid: generateKey()}}, function(err, res){
        if(err)
            log(err);
        else
            log("Logged out "+ssid)
    })
}

function serverHandler(req, res){
    const clientIP = res.socket.remoteAddress;
    const url = req.url;
    var requestedFile = undefined;
    var fileExtension = undefined;
    rightmostFile = req.url.split("/").pop();
    
    if(rightmostFile.indexOf(".") == -1) requestedFile = undefined;
    else requestedFile = rightmostFile;

    if(requestedFile) fileExtension = requestedFile.split(".").pop();
    
    log("Client "+clientIP+" has accessed "+url+", requested file = "+requestedFile+" with extension "+fileExtension)
    var userAgent = req.headers["user-agent"]

    if(fileExtension){
        const ALLOWED_REQUEST_EXTENSIONS = ["ico", "css", "html", "gif"]
        if(ALLOWED_REQUEST_EXTENSIONS.indexOf(fileExtension) == -1)
            throw403(res);
        else{
            fs.readFile(getPublicFilePath(requestedFile), function(err, data){
                if(err) throwResponse(res, 500);
                else throwResponse(res, 200, data)
            })
        }
    }
    else {
        switch (url){
            case "/favicon.ico":
                throwFavicon(res);
                break;
            case "/":
                fs.readFile(getPublicFilePath("welcome.html"), function(err, data){
                    if(err) throwResponse(res, 500);
                    else throwResponse(res, 200, data);
                })
                break;
            case "/login":
                if(req.method == "POST"){
                    var body = [];
                    req.on("error", (err) => log(err))
                    req.on("data", function(chunk){ body.push(chunk); });
                    req.on("end", function(){
                        data = JSON.parse(Buffer.concat(body).toString());

                        res.on("error", (err) => log(err))

                        var {user, pass} = data

                        if(!user) throwResponse(res, 400, "Username cannot be empty.");
                        else if(!pass) throwResponse(res, 400, "Password cannot be empty.");
                        else {
                            login_1_username(res, dbo, user, pass)
                        }
                    })
                }
                else throw404(res);
                break;
            case "/register":
                if(req.method == "POST"){
                    var body = [];
                    req.on("error", (err) => log(err));
                    req.on("data", function(chunk){ body.push(chunk) });
                    req.on("end", function(){
                        data = JSON.parse(Buffer.concat(body).toString())
                        res.on("error", (err) => log(err))

                        var {user, pass, age} = data
                        age = parseInt(age)
                        if(!user) throwResponse(res, 400, "Username cannot be empty.")
                        if(!pass) throwResponse(res, 400, "Password cannot be empty.")
                        if(!age) throwResponse(res, 400, "Age cannot be empty.")
                        else {
                            register_1_checkUser(res, dbo, user, pass, age)
                        }
                    })
                }
                else throw404(res);
                break;
            case "/logout":
                if(req.method == "POST"){
                    var body = [];
                    req.on("error", (err) => log(err));
                    req.on("data", function(chunk){ body.push(chunk) });
                    req.on("end", function(){
                        data = JSON.parse(Buffer.concat(body).toString())
                        res.on("error", (err) => log(err))

                        ssid = data.ssid
                        logout(dbo, ssid)
                    })
                }
                else throw404(res);
                break;
            default:
                throw404(res);
                break;
        }
    }
}


MongoClient.connect(mongodbUrl, {useNewUrlParser: true}, function(err, client){
    if(err) throw err;

    /// =====================================[ Create Database ]=====================================
    dbo = client.db("MajesticCoveDB")
    createDatabase(dbo);

    /// =====================================[ Start Web Server ]=====================================
    var server = http.createServer(serverHandler);
    server.listen(80);
})



    /*/// =====================================[ Initialise App ]=====================================
    app.use(bodyParser.json()); /// Form parsing
    app.use(express.static(__dirname + '/public/views')); /// Serve "/public" css, js, imgs etc

    /// =====================================[ Test Database ]=====================================
    /*var user={name: "Cats_1", age: "34", password: "helloworld", random: Math.random()}
    var user2={name: "Cats_2", age: "34", password: "helloworld", random: Math.random()}

    dbo.collection("users").deleteMany({}, function(err, res){
        if(err) throw err; 
        console.log("Deleted everything...") 
        dbo.collection("users").insert([user, user2], function(err, res){
            if(err) throw err;
            console.log("Inserted an user...");
            //console.log(res);

            dbo.collection("users").find({}).toArray(function(err, res){
                if(err) throw err;
                console.log("Found users...")
                console.log(res);
            })
        });
    });*/

    /*
    
    /// Start Webserver
    app.listen(80, function () {
        var host = this.address().address
        var port = this.address().port

        console.log("Web server listening at http://%s:%s", host, port)
    })

    /// =====================================[ Routes ]=====================================
    app.get("/", function(req, res){
        res.sendFile(__dirname + "/public/views/welcome.html")
    })

    app.get("/main", function(req, res){
        res.sendFile(__dirname + "/public/views/main.html")
    })

    /// Routes with Database connection
    app.post("/register", function(req, res){
        /// Validate FORM
        req.body.age = parseInt(req.body.age)
        if(!req.body.user) res.status(400).send({message: "Username cannot be empty."});
        else if(!req.body.pass) res.status(400).send({message: "Password cannot be empty."});
        else if(!req.body.age) res.status(400).send({message: "Age cannot be empty."});
        else if(!(req.body.age >= 0 && req.body.age <= 150)) res.status(400).send({message: "Age is invalid."});
        else { /// Form data is valid
            dbo.collection("users").insert({username: req.body.user, password: req.body.pass, age: req.body.age}, function(err, insert_res){ // Insert the user
                if(err){
                    var msg = "An error has occurred while registering. Please try again.";
                    if(err.message.indexOf("duplicate key error collection") != -1)
                        msg = "Username is already taken."
                    res.status(500).send({message: msg})
                    console.log("Error on /register")
                    console.log(err)
                }
                else {
                    console.log("Inserted user with username = "+req.body.user)

                    res.status(200).send({message: "Your account has been created!"})
                }
            });
        }
    });

    app.post("/login", function(req, res){
        if(!req.body.user) res.status(400).send({message: "Username cannot be empty."});
        else if(!req.body.pass) res.status(400).send({message: "Password cannot be empty."});
        else {
            console.log("User = "+req.body.user)
            console.log("Pass = "+req.body.pass)
            dbo.collection("users").find({username: req.body.user}).toArray(function(err, find_res){
                if(err){
                    console.log("Error on /login (1)"); console.log(err)
                    res.status(500).send({message: "An error has occurred while logging in. Please try again."});
                }
                else {
                    if(find_res.length == 0){
                        res.status(401).send({message: "Username does not exist!"})
                    }
                    else {
                        var loginQuery = {username: req.body.user, password: req.body.pass}
                        dbo.collection("users").find(loginQuery).toArray(function(err, find_res_v2){
                            if(err){
                                console.log("Error on /login (2)"); console.log(err)
                                res.status(500).send({message: "An error has occurred while logging in. Please try again."});
                            }
                            else {
                                if(find_res_v2.length == 0){
                                    res.status(401).send({message: "Password is incorrect."})
                                }
                                else {
                                    userid = find_res_v2[0]._id
                                    ssid = generateKey()
                                    dbo.collection("users").updateMany(loginQuery, {$set: {ssid: ssid}}, function(err, update_res){
                                        if(err){
                                            console.log("Error on /login (4)"); console.log(err)
                                            res.status(500).send({message: "An error has occurred while logging in. Please try again."});
                                        }
                                        else {
                                            res.status(200).send({message: "Succesfully logged in.", userid: userid, ssid: ssid})
                                        }
                                    })
                                }
                            }
                        })
                    }
                }
            });
        }
    });*/

/*var http = require('http');
//var url = require('url');
var fs = require('fs');

function serverHandler(req, res){
    var route = req.url;

    console.log(res.socket.remoteAddress+" accessed route "+route)

    if(route == "/"){
        console.log("Opening /...")
        fs.readFile("./public/welcome.html", function(err, data){
            if(err){
                res.writeHead(404);
                res.write("Welcome page could not be loaded.")
            }
            else{
                res.writeHead(200, {"Content-type": "text/html"});
                res.write(data);
            }
            res.end();
        })
    }
    else if(route == "/main"){

    }
    else if(route == "/register"){

    }
    else{
        res.writeHead(404);
        res.write("Page could not be found.")
        res.end();
    }
}

var server = http.createServer(serverHandler);
server.listen(80);*/

/*var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var MongoClient = require("mongodb").MongoClient;
var mongodbUrl = "mongodb://localhost:27017/MajesticCove";
var crypto = require("crypto")*/

/*/// Routes
function mainRoute(req, res) {
   res.sendFile(__dirname + "/public/main.html")
}
function homeRoute(req, res){
    res.sendFile(__dirname + "/public/welcome.html")
}

function initRoutes(app){
    app.get("/", homeRoute)
    app.get("/main", mainRoute)
}

function registerRoute(dbo, req, res){
    /// Validate FORM
    user = req.body.user
    pass = req.body.pass
    age = req.body.age

    if(!user) {
        res.status(400).send({message: "Username cannot be empty."});
        return;
    }
    if(!pass) {
        res.status(400).send({message: "Password cannot be empty."});
        return;
    }
    if(!age) {
        res.status(400).send({message: "Age cannot be empty."});
        return;
    }
    if(!(age >= 0 && age <= 150)) {
        res.status(400).send({message: "Age is invalid."});
        return;
    }

    /// Check that 

    /// Insert User
    dbo.collection("users").insert({username: req.body.user, password: req.body.password, age: req.body.age}, function(err, res){
        if(err) throw err;
        console.log(res)
    })

    userid = -1
    ssid = generateKey()

    console.log("Received a POST /register request with the following parameters:")
    res.status(200).send({message: "Your account has been created!", ssid: ssid, userid: userid})
}

/// Database
function test_database(dbo){
    var user={name: "Cats_1", age: "34", password: "helloworld", random: Math.random()}
    var user2={name: "Cats_2", age: "34", password: "helloworld", random: Math.random()}

    dbo.collection("users").deleteMany({}, function(err, res){
        if(err) throw err; 
        console.log("Deleted everything...") 
        dbo.collection("users").insert([user, user2], function(err, res){
            if(err) throw err;
            console.log("Inserted an user...");
            //console.log(res);

            dbo.collection("users").find({}).toArray(function(err, res){
                if(err) throw err;
                console.log("Found users...")
                console.log(res);
            })
        });
    });
}

function generateKey(){
    var hash = crypto.createHash("sha256"); 
    hash.update(Math.random().toString());
    return hash.digest("hex");
}

/// Initialisations
function initApp(){
    app.use(bodyParser.json()); /// Form parsing
    app.use(express.static(__dirname + '/public')); /// Serve "/public" css, js, imgs etc
}

function initRoutes(app){
    app.get("/", homeRoute)
    app.get("/main", mainRoute)
}

function main(){
    MongoClient.connect(mongodbUrl, {useNewUrlParser: true}, function(err, client){
        if(err) throw err;
        dbo = client.db("MajesticCove")

        

        function startWebServer(){
            app.listen(80, function () {
                var host = this.address().address
                var port = this.address().port

                console.log("Example app listening at http://%s:%s", host, port)
            })
        }

        function initRoutes_API(app, dbo){
            app.post("/register", function(req, res){registerRoute(dbo, req, res)});
        }

        initApp();
        initRoutes(app);
        //initRoutes_API(app, dbo);

        startWebServer();

        test_database(dbo);
    })
}

main();*/