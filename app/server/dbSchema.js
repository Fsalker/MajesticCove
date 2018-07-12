// ================================================================ //
//                                                                  //
//      The Database's schema.                                      //
//                                                                  //
//      Pretty cool, isn't it? Now we might actually be able to     //
//  port the server to another server, if that will ever be the     //
//  case.                                                           //
//                                                                  //
// ================================================================ //

var cfg = require("./config.js")

module.exports = {
    createDatabase: function(dbo){
        const DROP_COLLECTIONS = 1;

        var createCollections = function()
        {
            dbo.createCollection("users", {
                validator:{
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["username", "password", "votes", "karma"],
                        properties: {
                            username: {
                                bsonType: "string",
                                description: "username here"
                            },
                            password: {
                                bsonType: "string",
                                description: "password here"
                            },
                            ssid: {
                                bsonType: "string",
                                description: "ssid not here. do not toy with this :D"
                            },
                            votes: {
                                bsonType: "array",
                                description: "the user's liked and disliked definitions"
                            },
                            karma: {
                                bsonType: "int",
                                description: "the sum of this all this user's definitions's upvotes / downvotes"
                            }
                        }
                    }
                }
            }, function(err, data){
                if(err) cfg.log(err)
                dbo.collection("users").createIndex({"username": 1}, {unique: true})
            })

            dbo.createCollection("definitions", {
                validator:{
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["word", "definition", "userid", "rating"],
                        properties: {
                            word: {
                                bsonType: "string",
                            },
                            definition: {
                                bsonType: "string",
                            },
                            userid: {
                                bsonType: "objectId",
                            },
                            rating: {
                                bsonType: "int"
                            }
                        }
                    }
                }
            }, function(err, data){
                if(err) cfg.log(err)
            })
        }
        
        if(DROP_COLLECTIONS)
            dbo.dropDatabase("users", createCollections)
        else
            createCollections();
    }
}