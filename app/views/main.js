// ================================================================================================================================
// ============================================================ CONFIG ============================================================
// ================================================================================================================================
const COOKIE_LIFETIME_DAYS = 1;

// API Front-End Messages
const ERROR_BACKEND_SOMETHING = "An error has occurred, please try again. If this error persists, try logging into your account again."
const ERROR_WORD_EMPTY = "Please insert a word."
const ERROR_DEFINITION_EMPTY = "Please insert a definition."
const ERROR_USERNAME_EMPTY = "Username cannot be empty."
const ERROR_PASSWORD_EMPTY = "Password cannot be empty."
const ERROR_USERNAME_TAKEN = "Username is already taken."
const ERROR_AUTHENTIFICATION_FAILED = "Authentification failed. Check your credentials and try again."

const WARNING_NO_WORDS_FOUND_AFTER_SEARCH = "Uh oh... There are no results to show for this word. You should add your own definition!"
const WARNING_NO_RANDOM_WORDS_FOUND_AFTER_SEARCH = "Oh, there really aren't any definitions to show. You should totally add some by yourself!"
const WARNING_NO_DEFINITIONS_ADDED = "You haven't added any definitions yet. Go add some!"

const SUCCESS_ADD_DEFINITION = "Your word definition has been succesfully added!"
const SUCCESS_DELETED_DEFINITION = "Your word definition has been succesfully removed!"

// ================================================================================================================================
// =========================================================== FUNCTIONS ==========================================================
// ================================================================================================================================
function getDefinitionIconClass(definition, thumbs){ // Gives us the appropriate "fas", "far" or "" class for a given definition's thumbs up or thumbs down icon (based on whether the user has liked/disliked the post)
    console.log(app.votes)
    if(!app.votes) return "far"
    vote = app.votes.filter( vote => vote.definitionid == definition._id)[0]

    console.log(vote)
    if(vote == undefined)
        return "far"
    else
        console.log("thumbs = "+thumbs)
        if(thumbs == "up")
            return vote.likes == 1 ? "fas" : "far"
        else if(thumbs == "down")
            return vote.likes == -1 ? "fas" : "far"
        else console.log("Wrong 'thumbs' type")

    //console.log("I've somehow reached the end of the function ;o")
}

function dislikedDefinition(definition){ // Same as above, but reversed :~)
    return !likedDefinition(definition)
}

function saveVote(definition, likes){ // Saves a liked/disliked definition in app.votes & cookies
    vote = app.votes.filter( vote => vote.definitionid == definition._id)[0]

    if(vote == undefined) { // First time voting this definition, so we push a new vote
        app.votes.push({definitionid: definition._id, likes: likes})
        console.log("Pushed a new vote")
    }
    else { // Updating the existing vote
        vote.likes = likes
        console.log("Updated the vote")
    }
    setCookie("votes", JSON.stringify(app.votes))
}

function getTabObjectByTitle(title){ // Gets a Tab object matching the title
    if(title == "Search") return app.searchWord
    else if(title == "Random") return app.randomWords
    else if(title == "My definitions") return app.myDefinitions
    else if(title == "Add definition") return app.addDefinition

    return undefined
}

function setAlertObject(obj, msg, alertType){ // Sets the Object's Alert response (text) and variant
    obj.response = msg
    obj.responseVariant = alertType
}

function resetAlertObject(obj){ // Resets the Object's Alert properties
    setAlertObject(obj, "", "")
}

function resetObject(obj){ // Resets all of the Object's properties
    for(prop in obj)
        obj[prop] = null
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function getJsonCookie(cname){
    jsonStr = getCookie(cname)
    if(jsonStr)
        return JSON.parse(jsonStr)
    else
        return undefined
}

function deleteCookie(cname){
    setCookie(cname, null, 0);
}

// ================================================================================================================================
// ======================================================== VUE COMPONENTS ========================================================
// ================================================================================================================================
Vue.component("word_post", {
    props: ["definition"], // .definition, .word, .rating, userkarma, .username, .id
    /*template:  `<div class="my-2 p-2" style="color: #66FCF1; background: #1F2833;border: 2px solid #0B0C10; border-radius: .25rem">*/
    template:  `<div class="my-2 p-2" style="color: #66FCF1; background: #1F2833;border: 2px solid #0B0C10; border-radius: .25rem">
                    <p><strong>{{definition.word}}</strong>: {{definition.definition}}</p>
                    <span>{{definition.likes}} out of {{(definition.likes + definition.dislikes)}} users have appreciated this definition. Submitted by <strong>{{definition.username}}.</strong>
                        <i class="icon mx-1 fa-thumbs-up" @click="app.voteDefinition(definition, 1)" v-bind:class="getDefinitionIconClass(definition, 'up')"></i>
                        <i class="icon fa-thumbs-down" @click="app.voteDefinition(definition, -1)" v-bind:class="getDefinitionIconClass(definition, 'down')"></i>
                    </span>
                    <template v-if="definition.userid==app.userid && app.activeTabTitle=='My definitions'">
                        <div class="float-right mr-1"">
                            <i class="fas fa-trash icon" v-on:click="app.deleteMyDefinition(definition._id)" ></i>
                        </div>
                    </template>
                </div>`
})

Vue.component("backend_alert",{
    props: ["data"], // data.response, data.responseVariant
    template:  `<b-alert show v-bind:variant="data.responseVariant" v-if="data.response">
                    {{data.response}}
                </b-alert>`
})

// ================================================================================================================================
// ============================================================ VUE APP ===========================================================
// ================================================================================================================================
var app = new Vue({
    el: "#app",
    // ========================================================= app.data =========================================================
    data: {
            // App
        tabs: [
            { title: "Search", visible: true },
            { title: "Random", visible: true },
            { title: "My definitions", visible: false},
            { title: "Add definition", visible: false}
        ],
        activeTabTitle: "Search",
        showHelp: false,
        showDebugData: false,

            // Cookies
        username: getCookie("username"),
        userid: getCookie("userid"),
        ssid: getCookie("ssid"),
        votes: getJsonCookie("votes"),

            // Search Word
        searchWord: {
            word: null,
            response: null,
            responseVariant: null,
            wordList: null
        },

            // Random Words
        randomWords: {
            response: null,
            responseVariant: null,
            wordList: null
        },

            // My Definitions
        myDefinitions: {
            response: null,
            responseVariant: null,
            wordList: null
        },

            // Add Definition
        addDefinition: {
            word: null,
            definition: null,
            response: null,
            responseVariant: null
        },
        numAddedDefinitions: 0,

            // Login
        login: {
            user: null,
            pass: null,
            response: null,
            responseVariant: null
        },

            // Register
        register: {
            user: null,
            pass: null,
            response: null,
            responseVariant: null
        }
    },
    // ======================================================= app.computed =======================================================
    computed: {
        loggedin: function(){ // Tells us whether the user is currently logged in
            var newLoginState = (this.ssid && this.userid)? true : false
            return newLoginState
        },

        activeTabObject: function(){
            return getTabObjectByTitle(this.activeTabTitle)
        }
    },
    // ======================================================== app.watch =========================================================
    watch: {
        loggedin: {
            immediate: true,
            handler: function(newLoginState){ // Tells us whether the user is currently logged
                console.log("Loggedin state has changed!\n\n")
                var SHOW_ONLY_WHEN_LOGGED_IN = ["My definitions", "Add definition"]
                var changingTab = false
                console.log("------------------------")
                for(tab of this.tabs) {
                    if (SHOW_ONLY_WHEN_LOGGED_IN.indexOf(tab.title) != -1) { // We hide a few certain tabs when we're not logged in
                        if (tab.visible == true && newLoginState == false) // Hiding a tab that's currently visible
                            if (tab.title == this.activeTabTitle) // Hiding the currently active tab
                                changingTab = true
                        tab.visible = newLoginState
                    }
                }
                if(changingTab) // [Super bug v1] I fixed "super bug v1" by calling changeActiveTab() outside the for loop... But why does it work now?
                    this.changeActiveTab("Search") // Change to our 'Search' tab
                if(newLoginState) { // We're logged in, therefore we reset the Login & Register objects
                    resetObject(this.register)
                    resetObject(this.login)
                }
                else { // We're logged out, so we wipe our stored definitions (and all personal, sensitive data :^) )
                    resetObject(this.myDefinitions)
                    resetObject(this.addDefinition)
                }
            }
        }
    },
    // ======================================================== app.methods =======================================================
    methods: {
        voteDefinition(definition, likes){ // Vote a definition. likes = true / false
            if(!app.loggedin){
                setAlertObject(app.activeTabObject, "You must be logged in in order to vote definitions.", "warning")
                return;
            }

            data = {
                userid: app.userid,
                ssid: app.ssid,
                definitionid: definition._id,
                likes: likes,
                ownerUserid: definition.userid
            }

            var req = new XMLHttpRequest()
            req.open("POST", "voteDefinition")
            req.setRequestHeader("content-type", "application/json")
            req.send(JSON.stringify(data))

            req.onreadystatechange = function () {
                if (this.readyState == 4) {
                    likeStr = likes==1?"liked":"disliked"
                    if (this.status == 200) {
                        res = JSON.parse(this.response)
                        console.log("Success!!1")

                        //setAlertObject(app.activeTabObject, "You have succesfully "+likeStr+" the definition!", "success")
                        resetAlertObject(app.activeTabObject)
                        definition.likes += res.likeAdd
                        definition.dislikes += res.dislikeAdd
                        saveVote(definition, likes)
                    }
                    else if(this.status == 409) setAlertObject(app.activeTabObject, "You have already "+likeStr+" the definition!", "warning")
                    else setAlertObject(app.activeTabObject, ERROR_BACKEND_SOMETHING, "danger")
                }
            }
        },

        getWordDefinitions(){ // Search words
            if(!app.searchWord.word) setAlertObject(app.searchWord, ERROR_WORD_EMPTY, "warning")
            else {
                data = {
                    word: app.searchWord.word
                }

                console.log("word = "+data.word)

                var req = new XMLHttpRequest()

                req.open("POST", "getWordDefinitions")
                req.setRequestHeader("Content-Type", "application/json")
                req.send(JSON.stringify(data));

                req.onreadystatechange = function () {
                    if (this.readyState == 4) {
                        if (this.status == 200) {
                            res = JSON.parse(this.response)

                            app.searchWord.wordList = res["words"]
                            app.searchWord.response = null
                            if(app.searchWord.wordList.length == 0)
                                setAlertObject(app.searchWord, WARNING_NO_WORDS_FOUND_AFTER_SEARCH, "secondary")
                        }
                        else setAlertObject(app.searchWord, ERROR_BACKEND_SOMETHING, "danger")
                    }
                }
            }
        },

        deleteMyDefinition(definitionId){ // Delete one of my definitions
            data = {
                userid: app.userid,
                ssid: app.ssid,
                "definitionid": definitionId
            }
            console.log("Data = ")
            console.log(data)

            console.log("Deleting "+definitionId)

            var req = new XMLHttpRequest()
            req.open("POST", "deleteMyDefinition")
            req.setRequestHeader("content-type", "application/json")
            req.send(JSON.stringify(data))

            req.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        app.getMyDefinitions()
                        //setAlertObject(app.myDefinitions, SUCCESS_DELETED_DEFINITION, "success")
                    }
                    else setAlertObject(app.login, ERROR_BACKEND_SOMETHING, "danger")
                }
            }
        },

        getMyDefinitions(){ // Show my definitions
            data = {
                userid: app.userid,
                ssid: app.ssid
            }

            console.log(data)

            var req = new XMLHttpRequest
            req.open("POST", "showMyDefinitions")
            req.setRequestHeader("content-type", "application/json")
            req.send(JSON.stringify(data))

            req.onreadystatechange = function(){
                if(this.readyState == 4){
                    if(this.status == 200){
                        res = JSON.parse(this.response)

                        app.myDefinitions.wordList = res["words"]
                        app.myDefinitions.response = null
                        if(app.myDefinitions.wordList.length == 0)
                            setAlertObject(app.myDefinitions, WARNING_NO_DEFINITIONS_ADDED, "secondary")
                    }
                    else setAlertObject(app.myDefinitions, ERROR_BACKEND_SOMETHING, "danger")
                }
            }
        },

        getRandomDefinitions(){ // Get some definitions!
            var req = new XMLHttpRequest
            req.open("POST", "getRandomWords")
            req.send()
            req.onreadystatechange = function(){
                if(this.readyState == 4){
                    if(this.status == 200){
                        res = JSON.parse(this.response)

                        app.randomWords.wordList = res["words"]
                        app.randomWords.response = null
                        if(app.randomWords.wordList.length == 0)
                            setAlertObject(app.randomWords, WARNING_NO_RANDOM_WORDS_FOUND_AFTER_SEARCH, "secondary")
                    }
                    else setAlertObject(app.addDefinition, ERROR_BACKEND_SOMETHING, "danger")
                }
            }
        },

        submitDefinition(){ // Add a definition
            if(!app.addDefinition.word) setAlertObject(app.addDefinition, ERROR_WORD_EMPTY, "warning")
            else if(!app.addDefinition.definition) setAlertObject(app.addDefinition, ERROR_DEFINITION_EMPTY, "warning")
            else{
                data = {
                    word: app.addDefinition.word,
                    definition: app.addDefinition.definition,
                    username: app.username,
                    userid: app.userid,
                    ssid: app.ssid
                }

                var req = new XMLHttpRequest
                req.open("POST", "addDefinition")
                req.setRequestHeader("content-type", "application/json")
                req.send(JSON.stringify(data))

                req.onreadystatechange = function(){
                    if(this.readyState == 4){
                        if(this.status == 200){
                            ++app.numAddedDefinitions
                            howMany = ""
                            if(app.numAddedDefinitions >= 2)
                                howMany = " ("+app.numAddedDefinitions+")"
                            setAlertObject(app.addDefinition, SUCCESS_ADD_DEFINITION + howMany, "success")
                        }
                        else setAlertObject(app.addDefinition, ERROR_BACKEND_SOMETHING, "danger")
                    }
                }
            }
        },

        changeActiveTab(tabTitle){ // Change the tab
            if(app.activeTabTitle == tabTitle)
                return;


            app.activeTabTitle = tabTitle
            for(tab of app.tabs)
                if(tab.title != tabTitle) // [Super bug v1] accessing tab.title causes our 'My definitions' tab to have its .visible property set to false
                    resetAlertObject(tab)

            if(tabTitle == "My definitions"){
                app.getMyDefinitions()
            }
            else if(tabTitle == "Random"){
                app.getRandomDefinitions()
            }
        },

        login_credentials(userid, ssid, username, votes){ // Set the login credentials into our app and cookies :]
            app.userid = userid
            app.ssid = ssid
            app.username = username
            app.votes = votes

            setCookie("userid", userid, COOKIE_LIFETIME_DAYS)
            setCookie("ssid", ssid, COOKIE_LIFETIME_DAYS)
            setCookie("username", username, COOKIE_LIFETIME_DAYS)
            setCookie("votes", JSON.stringify(votes), COOKIE_LIFETIME_DAYS)
        },

        login_f(){ // Log me in
            app.showLoadingLogin = true;

            // Validate the data
            if(!app.login.user) setAlertObject(app.login, ERROR_USERNAME_EMPTY, "warning")
            else if(!app.login.pass) setAlertObject(app.login, ERROR_PASSWORD_EMPTY, "warning")
            else { // Everything's alright
                data = {
                    user: app.login.user,
                    pass: app.login.pass
                }

                var req = new XMLHttpRequest();

                req.open("POST", "login")
                req.setRequestHeader("content-type", "application/json")
                req.send(JSON.stringify(data));

                req.onreadystatechange = function () {
                    if (this.readyState == 4) {
                        app.showLoadingLogin = false;
                        console.log(this.response);
                        if (this.status == 200) {
                            res = JSON.parse(this.response)

                            app.login_credentials(res.userid, res.ssid, data.user, res.votes)
                        }
                        else if(this.status == 401) setAlertObject(app.login, ERROR_AUTHENTIFICATION_FAILED, "danger")
                        else setAlertObject(app.login, ERROR_BACKEND_SOMETHING, "danger")
                    }
                }
            }
        },
        register_f(){ // Register me
            // Validate the data
            if(!app.register.user) setAlertObject(app.register, ERROR_USERNAME_EMPTY, "warning")
            else if(!app.register.pass) setAlertObject(app.register, ERROR_PASSWORD_EMPTY, "warning")
            else { // Everything's alright
                this.showLoadingRegister = true;

                data = {
                    user: this.register.user,
                    pass: this.register.pass
                }

                var req = new XMLHttpRequest();

                req.open("POST", "/register")
                req.setRequestHeader("content-type", "application/json")
                req.send(JSON.stringify(data))

                req.onreadystatechange = function () {
                    if (this.readyState == 4) {
                        app.showLoadingRegister = false
                        console.log(this.response);
                        if (this.status == 200) {
                            res = JSON.parse(this.response)

                            app.login_credentials(res.userid, res.ssid, data.user, res.votes)
                        }
                        else if(this.status == 409) // Register conflict. The only possibility is an already taken username
                            setAlertObject(app.register, ERROR_USERNAME_TAKEN, "danger")
                        else setAlertObject(app.register, ERROR_BACKEND_SOMETHING, "danger")
                    }
                }
            }
        },
        logout(){ // Log me out
            var req = new XMLHttpRequest();
            req.open("POST", "/logout")
            req.setRequestHeader("content-type", "application/json")
            req.send(JSON.stringify({ssid: this.ssid, userid: this.userid}));

            this.username = null
            this.userid = null
            this.ssid = null
            this.votes = null
            deleteCookie("username")
            deleteCookie("userid")
            deleteCookie("ssid")
            deleteCookie("votes")
        }
    }
});