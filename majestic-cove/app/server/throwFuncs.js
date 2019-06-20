// ================================================================ //
//                                                                  //
//      When you want to quickly "throw" a http result, this is the //
//  right place to look after.                                      //
//                                                                  //
// ================================================================ //

var fs = require("fs")
var cfg = require("./config.js")

function getPublicFilePath(fileName){
    return cfg.VIEWS_PATH + fileName;
}

module.exports = {
    throw500: function(res){ /// 500 - Internal Server Error
        res.writeHead(500, {"Content-type": "text/html"})
        res.end("<h1>Error 500 - Internal Server Error</h1><p>An unexpected internal error has occurred while handling your request.</p>")
    },

    throwResponse: function(res, statusCode, data, dataExtension){
        if(data && !cfg.HTML_RESPONSES[statusCode]){
            cfg.log("Status code "+statusCode+" does not exist!")
            this.throw500(res);
        }

        res.writeHead(statusCode, {"content-type":"text/html"})
        if(!data){
            res.writeHead(statusCode, {"content-type":"text/html"})
            res.end(cfg.HTML_RESPONSES[statusCode])
        }
        else{
            if(dataExtension){

                if(dataExtension == "html") res.writeHead(statusCode, {"content-type":"text/html"})
                else if(dataExtension == "css") res.writeHead(statusCode, {"content-type":"text/css"})
                else if(dataExtension == "ico") res.writeHead(statusCode, {"content-type":"image/x-icon"})
                else res.writeHead(statusCode) 
            }
            res.end(data)
        }
    },

    throwServedFile: function(res, requestedFile){
        extension = requestedFile.split(".")[1]

        fs.readFile(getPublicFilePath(requestedFile), function(err, data){
            if(err) module.exports.throwResponse(res, 500);
            else module.exports.throwResponse(res, 200, data, extension)
        })
    }
}