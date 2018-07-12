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
var ObjectID = require("mongodb").ObjectID

function generateKey(){
    var hash = crypto.createHash("sha256"); 
    hash.update(Math.random().toString());
    return hash.digest("hex");
}

function handlePostRequest(req, res, dbo, request_callback){ // Handles POST requests sent to the server. Calls 'request_callback' on success.
    if(req.method == "POST"){
        var body = [];
        req.on("error", (err) => cfg.log(err));
        req.on("data", function(chunk){ body.push(chunk) });
        req.on("end", function(){
            res.on("error", (err) => cfg.log(err))
            data = ""
            try{
                data = JSON.parse(Buffer.concat(body).toString())
            }
            catch(e){
                cfg.log(e)
                throws.throwResponse(res, 400)
            }
            if(data)
                request_callback(res, dbo, data)
            //data = JSON.parse(Buffer.concat(body).toString())
            //request_callback(res, dbo, data)
        })
    }
    else throws.throwResponse(res, 404);
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
            if(find_res.length > 0) {
                userid = find_res[0]._id
                data.userid = userid
                login_3_ssid(res, dbo, data)
            }
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
            throws.throwResponse(res, 200, JSON.stringify({ssid: ssid, userid: data.userid}))
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
    dbo.collection("users").insert({username: data.user, password: data.pass, ssid: ssid, votes: [], karma: 0}, function(err, insert_res){
        if(err){
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else{
            userid = insert_res.ops[0]._id
            throws.throwResponse(res, 200, JSON.stringify({ssid: ssid, userid: userid}))
        }
    })
}

function logout(dbo, userid){ // Reset the ssid
    dbo.collection("users").updateMany({_id: userid}, {$set: {ssid: generateKey()}}, function(err, res){
        if(err){
            cfg.log(err);
            throws.throwResponse(res, 500)
        }
        else
            cfg.log("Logged out "+userid)
    })
}

function authentificate_userid_ssid(res, dbo, data, query_callback){ // Validate userId & ssid
    dbo.collection("users").find({_id: data.userid, ssid: data.ssid}).toArray(function(err, find_res){
        if(err){
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else {
            console.log("_id = "+data.userid)
            console.log("ssid = "+data.ssid)

            if(find_res.length > 0) query_callback(res, dbo, data)
            else throws.throwResponse(res, 401, "Authentification failed!")
        }

    })
}

function addDefinition(res, dbo, data){
    dbo.collection("definitions").insert({word: data.word, definition: data.definition, userid: data.userid, rating: 0}, function(err, ins_res){
        if(err){
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else {
            throws.throwResponse(res, 200)
        }
    })
}

function getDefinitions(res, dbo, data){
    //dbo.collection("definitions").find({userid: data.userid}).toArray(function(err, find_res){
    dbo.collection("definitions").aggregate([
        {$match: data.matchObject},
        {
            $lookup: {
                from: "users",
                localField: "userid",
                foreignField: "_id",
                as: "userdata"
            }
        }
    ]).toArray(function(err, agg_res){
        if(err){
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else {
            console.log("Result = ")
            console.log(agg_res)
            for(elem of agg_res){
                console.log("Element = ")
                console.log(elem)
                elem.userid = elem.userdata[0]._id

                elem.userkarma = elem.userdata.karma
                if(!elem.userkarma) elem.userkarma = 0

                delete elem.userdata;
            }

            throws.throwResponse(res, 200, JSON.stringify(agg_res))
        }  
    })
}

function deleteMyDefinition(res, dbo, data){
    dbo.collection("definitions").remove({_id: data.definitionid}, function(err, rem_res){
        if(err){
            cfg.log(err)
            throws.throwResponse(res, 500)
        }
        else {
            throws.throwResponse(res, 200)
        }
    })
}

function voteDefinition(req, res, data){
    dbo.collection("users").find({userid: data.userid}).toArray(function(err, find_user_res){
        if(err){
            log(err)
            throws.throwResponse(res, 500)
        }
        else {
            user = find_user_res[0]
            votes = user.votes
            ;//if(!votes || )
            throws.throwresponse(res, 404)
        }
    })
}

module.exports = {
    defaultHandler: function(req, res, dbo){
        throws.throwServedFile(res, "welcome.html")
    },

    loginHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.user || typeof data.user != "string") throws.throwResponse(res, 400, "Invalid username.")
            else if(!data.pass || typeof data.pass != "string") throws.throwResponse(res, 400, "Invalid password.");
            else login_1_username(res, dbo, {user: data.user, pass:data.pass})
        })
    },

    registerHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.user || typeof data.user != "string") throws.throwResponse(res, 400, "Invalid username.")
            else if(!data.pass || typeof data.pass != "string") throws.throwResponse(res, 400, "Invalid password.");
            else register_1_checkUser(res, dbo, {user: data.user, pass: data.pass})
        })
    },

    logoutHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.userid || typeof data.userid != "string" || data.userid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid userid.")
            else if(!data.ssid || typeof data.ssid != "string") throws.throwResponse(res, 400, "Invalid ssid.")
            else logout(dbo, ObjectID.createFromHexString(data.userid))
        })
    },

    addDefinitionHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.userid || typeof data.userid != "string" || data.userid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid userid.")
            else if(!data.ssid || typeof data.ssid != "string") throws.throwResponse(res, 400, "Invalid ssid.")
            else if(!data.word || typeof data.word != "string") throws.throwResponse(res, 400, "The word is missing.")
            else if(!data.definition || typeof data.definition != "string") throws.throwResponse(res, 400, "The definition is missing.")
            else authentificate_userid_ssid(res, dbo, {userid: ObjectID.createFromHexString(data.userid), ssid: data.ssid, word: data.word, definition: data.definition}, addDefinition)
        })
    },

    showMyDefinitionsHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.userid || typeof data.userid != "string" || data.userid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid userid.")
            else if(!data.ssid || typeof data.ssid != "string") throws.throwResponse(res, 400, "Invalid ssid.")
            else authentificate_userid_ssid(res, dbo, {userid: ObjectID.createFromHexString(data.userid), ssid: data.ssid, matchObject: {userid: ObjectID.createFromHexString(data.userid)}}, getDefinitions)
        })
    },

    deleteMyDefinitionHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.userid || typeof data.userid != "string" || data.userid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid userid.")
            else if(!data.ssid || typeof data.ssid != "string") throws.throwResponse(res, 400, "Invalid ssid.")
            else if(!data.definitionid || typeof data.definitionid != "string" || data.definitionid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid definitionid.")
            else authentificate_userid_ssid(res, dbo, {userid: ObjectID.createFromHexString(data.userid), ssid: data.ssid, definitionid: ObjectID.createFromHexString(data.definitionid)}, deleteMyDefinition)
        })
    },

    getWordDefinitionsHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.word || typeof data.word != "string") throws.throwResponse(400, "Invalid word.")
            else getDefinitions(res, dbo, {matchObject: {word: {$regex: new RegExp(data.word, "i")}}})
        })
    },

    voteDefinitionHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.userid || typeof data.userid != "string" || data.userid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid userid.")
            else if(!data.ssid || typeof data.ssid != "string") throws.throwResponse(res, 400, "Invalid ssid.")
            else if(!data.definitionid || typeof data.definitionid != "string" || data.definitionid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid definitionid.")
            else if(!data.likes || typeof data.likes != "boolean") throws.throwResponse(res, 400, "Invalid like/dislike .")
            else authentificate_userid_ssid(res, dbo, {userid: ObjectID.createFromHexString(data.userid), definitionid: ObjectID.createFromHexString(data.definitionid), ssid: data.ssid, likes: data.likes}, voteDefinition)
        })
    },


}