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