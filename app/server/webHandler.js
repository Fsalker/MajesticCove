// ================================================================ //
//                                                                  //
//      All the "web server magic url hacks" goes in here.          //                                                                
//                                                                  //
//      Need to add a new path? Or perhaps just a new API? Go ahead //
//  and fill a few lines of code in this module.                    //
//                                                                  //                                                                  
// ================================================================ //

var fs = require("fs")
var crypto = require("crypto")
var cfg = require("./config.js")
var throws = require("./throwFuncs.js")

function generateKey(){
    var hash = crypto.createHash("sha256"); 
    hash.update(Math.random().toString());
    return hash.digest("hex");
}

function login_1_username(res, dbo, data){ // Check that the username exists
    dbo.collection("users").find({username: {$regex: new RegExp(data.user, "i")}}).toArray(function(err, find_res){
        if(err) {
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else{
            if(find_res.length > 0) login_2_password(res, dbo, data)
            else throws.throwResponse(res, 401, "Username does not exist!")
        }
    })

}

function login_2_password(res, dbo, data){ // Authentificate with user & pass
    dbo.collection("users").find({username: {$regex: new RegExp(data.user, "i")}, password: data.pass}).toArray(function(err, find_res){
        if(err) {
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else{
            if(find_res.length > 0) login_3_ssid(res, dbo, data)
            else throws.throwResponse(res, 401, "Password is incorrect.")
        }
    })
}

function login_3_ssid(res, dbo, data){ // Set the SSID and answer the request
    ssid = generateKey()

    findQuery = {username: data.user}
    updateQuery = {$set: {ssid: ssid}}

    dbo.collection("users").updateMany(findQuery, updateQuery, function(err, update_res){
        if(err) {
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else
            throws.throwResponse(res, 200, JSON.stringify({ssid: ssid}))
    })
}

function register_1_checkUser(res, dbo, data){ // Check that the user is available
    dbo.collection("users").find({username: data.user}).toArray(function(err, find_res){
        if(err){
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else {
            if(find_res.length == 0)
                register_2_insert(res, dbo, data)
            else
                throws.throwResponse(res, 401, "Username is taken!")
        }

    })
}

function register_2_insert(res, dbo, data){ // Register the new user
    ssid = generateKey()
    dbo.collection("users").insert({username: data.user, password: data.pass, ssid: ssid}, function(err, insert_res){
        if(err){
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else
            throws.throwResponse(res, 200, JSON.stringify({ssid: ssid}))
    })
}

function logout(dbo, ssid){ // Reset the ssid
    dbo.collection("users").updateMany({ssid: ssid}, {$set: {ssid: generateKey()}}, function(err, res){
        if(err){
            cfg.log(err);
            throws.throwResponse(res, 500)
        }
        else
            cfg.log("Logged out "+ssid)
    })
}

module.exports = {
    defaultHandler: function(req, res, dbo){
        throws.throwServedFile(res, "welcome.html")
    },

    loginHandler: function(req, res, dbo){
        if(req.method == "POST"){
            var body = [];
            req.on("error", (err) => cfg.log(err))
            req.on("data", function(chunk){ body.push(chunk); });
            req.on("end", function(){
                data = JSON.parse(Buffer.concat(body).toString());

                res.on("error", (err) => cfg.log(err))

                var {user, pass} = data
                dataQuery = {user, pass}

                if(!user) throws.throwResponse(res, 400, "Username cannot be empty.");
                else if(!pass) throws.throwResponse(res, 400, "Password cannot be empty.");
                else {
                    login_1_username(res, dbo, dataQuery)
                }
            })
        }
        else throws.throwResponse(res, 404);
    },

    registerHandler: function(req, res, dbo){
        if(req.method == "POST"){
            var body = [];
            req.on("error", (err) => cfg.log(err));
            req.on("data", function(chunk){ body.push(chunk) });
            req.on("end", function(){
                data = JSON.parse(Buffer.concat(body).toString())
                res.on("error", (err) => cfg.log(err))

                var {user, pass} = data
                var dataQuery = {user, pass}
                if(!user) throws.throwResponse(res, 400, "Username cannot be empty.")
                if(!pass) throws.throwResponse(res, 400, "Password cannot be empty.")
                else {
                    register_1_checkUser(res, dbo, dataQuery)
                }
            })
        }
        else throws.throwResponse(res, 404);
    },

    logoutHandler: function(req, res, dbo){
        if(req.method == "POST"){
            var body = [];
            req.on("error", (err) => cfg.log(err));
            req.on("data", function(chunk){ body.push(chunk) });
            req.on("end", function(){
                data = JSON.parse(Buffer.concat(body).toString())
                res.on("error", (err) => cfg.log(err))

                ssid = data.ssid
                logout(dbo, ssid)
            })
        }
        else throws.throwResponse(res, 404);
    }
}