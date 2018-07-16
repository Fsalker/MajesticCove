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

function logAndThrow500(err, res){
    cfg.log(err)
    throws.throwResponse(res, 500)
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
        })
    }
    else throws.throwResponse(res, 404);
}

// Login 1, 2, 3 - my personal early solution for avoiding callback hell :^)
function login_1_username(res, dbo, data){ // Check that the username exists | data: user, pass
    dbo.collection("users").find({username: {$regex: new RegExp(data.user, "i")}}).toArray(function(err, find_res){
        if(err) logAndThrow500(err, res)
        else{
            if(find_res.length > 0) login_2_password(res, dbo, data)
            else throws.throwResponse(res, 401, "Username does not exist!")
        }
    })

}

function login_2_password(res, dbo, data){ // Authentificate with user & pass | data: user, pass
    dbo.collection("users").find({username: {$regex: new RegExp(data.user, "i")}, password: data.pass}).toArray(function(err, find_res){
        if(err) logAndThrow500(err, res)
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

function login_3_ssid(res, dbo, data){ // Set the SSID and answer the request | data: user, pass
    ssid = generateKey()

    findQuery = {username: {$regex: new RegExp(data.user, "i")}}
    updateQuery = {$set: {ssid: ssid}}

    dbo.collection("users").update(findQuery, updateQuery, function(err, update_res){
        if(err) logAndThrow500(err, res)
        else {
            throws.throwResponse(res, 200, JSON.stringify({ssid: ssid, userid: data.userid}))
        }
    })
}

function register(res, dbo, data){ // Register the new user | data: user, pass
    ssid = generateKey()

    data.user = data.user.toLowerCase()
    dbo.collection("users").insert({username: data.user, password: data.pass, ssid: ssid, votes: [], karma: 0}, function(err, insert_res){
        if(err){
            cfg.log(err)
            if(err.code == 11000) throws.throwResponse(res, 409, "Username is taken")
            else throws.throwResponse(res, 500)
        }
        else{
            userid = insert_res.ops[0]._id
            throws.throwResponse(res, 200, JSON.stringify({ssid: ssid, userid: userid}))
        }
    })
}

function logout(res, dbo, data){ // Reset the ssid | data: userid, sessionid
    dbo.collection("users").updateMany({_id: data.userid, sessionid: data.sessionid}, {$set: {ssid: generateKey()}}, function(err, res){
        if(err){
            cfg.log(err);
            throws.throwResponse(res, 500)
        }
        else
            cfg.log("Logged out "+data.userid)
    })
}

function authentificate_userid_ssid(res, dbo, data, query_callback){ // Validate userId & ssid | data: userid, sesionid, (...)
    console.log(data)
    dbo.collection("users").find({_id: data.userid, ssid: data.ssid}).toArray(function(err, find_res){
        if(err)logAndThrow500(err, res)
        else {
            console.log("_id = "+data.userid)
            console.log("ssid = "+data.ssid)

            if(find_res.length > 0) query_callback(res, dbo, data)
            else throws.throwResponse(res, 401, "Authentification failed!")
        }

    })
}

function addDefinition(res, dbo, data){ // data: word, definition, userid
    dbo.collection("definitions").insert({word: data.word, definition: data.definition, userid: data.userid, username: data.username, rating: 0}, function(err, ins_res){
        if(err)logAndThrow500(err, res)
        else {
            throws.throwResponse(res, 200)
        }
    })
}

function getDefinitions(res, dbo, data){ // data: matchObject
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
        if(err)logAndThrow500(err, res)
        else {
            for(elem of agg_res){
                elem.userdata = elem.userdata[0] // We only link 1 author (User)...
                elem.userid = elem.userdata._id

                elem.userkarma = elem.userdata.karma

                delete elem.userdata;
            }
            console.log("Aggregate data = ")
            console.log(agg_res)

            throws.throwResponse(res, 200, JSON.stringify({words: agg_res}))
        }  
    })
}

function deleteMyDefinition(res, dbo, data){ // data: definitionid
    dbo.collection("definitions").remove({_id: data.definitionid}, function(err, rem_res){
        if(err)logAndThrow500(err, res)
        else {
            throws.throwResponse(res, 200)
        }
    })
}

function voteDefinition(res, dbo, data) { // data: userid, likes, definitionid, ownerUserid
    dbo.collection("users").find({_id: data.userid}).toArray(function (err, find_user_res) {
        if (err) logAndThrow500(err, res)
        else if(find_user_res.length == 0) logAndThrow500("Failed to find associated user /voteDefinition", res)
        else {
            user = find_user_res[0]
            votes = user.votes
            vote = votes.filter(vote => vote.definitionid.toHexString() == data.definitionid)[0]
            console.log("Definition's vote = "); console.log(vote)
            ratingAdd = undefined

            if (!vote) // our user is voting the definition for the first time
                ratingAdd = data.likes ? 1 : -1
            else {
                if (data.likes != vote.likes) // our user has changed their mind, reversing the vote
                    ratingAdd = data.likes ? 2 : -2
                else
                    throws.throwResponse(res, 400, "The definition has already been voted for, with the same value!")
            }

            if (ratingAdd) { // if we're voting accordingly, ie: adding new rating points
                //dislikeAdd = 0
                //if(!vote.likes && votes.likes != data.likes)

                dbo.collection("definitions").update({_id: data.definitionid}, {$inc: {rating: ratingAdd, dislikes: -ratingAdd}}, function (err, upd_res) {
                    if (err) {
                        log(err)
                        throws.throwResponse(res, 500)
                    }
                    else {
                        console.log(upd_res.result)
                        var bulk = dbo.collection("users").initializeOrderedBulkOp();
                        bulk.find({_id: data.userid}).updateOne({$pull: {votes: {definitionid: data.definitionid}}})
                        bulk.find({_id: data.userid}).updateOne({$push: {votes: {definitionid: data.definitionid, likes: ratingAdd > 0}}})
                        bulk.find({_id: data.ownerUserid}).updateOne({$inc: {karma: ratingAdd}})
                        bulk.execute()
                        throws.throwResponse(res, 200)
                    }
                })
            }
        }
    })
}

function updateUserKarma(dbo, userid, amount){
    dbo.collections("users").update({userid: userid}, {$set: {karma: karma + amount}}, function(err, res){
        if(err)
            cfg.log(err)
    })
}

function updateDefinitionRating(dbo, definitionid, amount){
    dbo.collections("definitions").update({definitionid: definitionid}, {$set: {rating: rating + amount}}, function(err, res){
        if(err)
            cfg.log(err)
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
            else register(res, dbo, {user: data.user, pass: data.pass})
        })
    },

    logoutHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.userid || typeof data.userid != "string" || data.userid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid userid.")
            else if(!data.ssid || typeof data.ssid != "string") throws.throwResponse(res, 400, "Invalid ssid.")
            else authentificate_userid_ssid(res, dbo, {userid: ObjectID.createFromHexString(data.userid), ssid: data.ssid}, logout)
        })
    },

    addDefinitionHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if(!data.userid || typeof data.userid != "string" || data.userid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid userid.")
            else if(!data.ssid || typeof data.ssid != "string") throws.throwResponse(res, 400, "Invalid ssid.")
            else if(!data.username || typeof data.username != "string") throws.throwResponse(res, 400, "The word is missing.")
            else if(!data.word || typeof data.word != "string") throws.throwResponse(res, 400, "The word is missing.")
            else if(!data.definition || typeof data.definition != "string") throws.throwResponse(res, 400, "The definition is missing.")
            else authentificate_userid_ssid(res, dbo, {userid: ObjectID.createFromHexString(data.userid), ssid: data.ssid, username: data.username, word: data.word, definition: data.definition}, addDefinition)
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
            if(!data.word || typeof data.word != "string") throws.throwResponse(res, 400, "Invalid word.")
            else getDefinitions(res, dbo, {matchObject: {word: {$regex: new RegExp(data.word, "i")}}})
        })
    },

    voteDefinitionHandler: function(req, res, dbo){
        handlePostRequest(req, res, dbo, function(res, dbo, data){
            if (!data.userid || typeof data.userid != "string" || data.userid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid userid.")
            else if (!data.ownerUserid || typeof data.ownerUserid != "string" || data.ownerUserid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid ownerUserid.")
            else if (!data.ssid || typeof data.ssid != "string") throws.throwResponse(res, 400, "Invalid ssid.")
            else if (!data.definitionid || typeof data.definitionid != "string" || data.definitionid.length != cfg.ID_STRING_LENGTH) throws.throwResponse(res, 400, "Invalid definitionid.")
            else if (typeof data.likes != "boolean") throws.throwResponse(res, 400, "Invalid like/dislike .")
            else authentificate_userid_ssid(res, dbo, {
                    userid: ObjectID.createFromHexString(data.userid),
                    definitionid: ObjectID.createFromHexString(data.definitionid),
                    ssid: data.ssid,
                    likes: data.likes,
                    ownerUserid: ObjectID.createFromHexString(data.ownerUserid)
                }, voteDefinition)
        })
    },


}