function homeRoute(req, res){
    res.sendFile(__dirname + "/public/welcome.html")
}