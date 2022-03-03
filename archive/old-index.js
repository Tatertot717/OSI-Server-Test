"use strict"

const express = require("express");
const socketio = require("socket.io");
var bodyParser = require('body-parser');
const fs = require("fs");
const path = require("path");

let rosterPath = 'rosters/players.json';

var players = JSON.parse(fs.readFileSync(rosterPath));
var devices = JSON.parse(fs.readFileSync('devices.json'));

var directory = fs.readdirSync("./rosters");
var index = directory.indexOf(players.fileName);
directory.unshift(directory.splice(index, 1)[0]);

var app = express();
var port = 443;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//EXPRESS ROUTES

app.route("/")
    .get((req, res) => { // main page
        res.render("index", { ...players, ...{ directory: directory } });
    });

app.route("/players") // path for interacting with the players.json file
    .get((req, res) => { // GET request will receive the players.json file
        res.json(players);
    })
    .post(bodyParser.urlencoded({ extended: true }), (req, res) => {
        console.log(req.body);
        
        rosterPath = `rosters/${req.body.rosterSelect}`;
        console.log(rosterPath);

        players = JSON.parse(fs.readFileSync(rosterPath));
        var index = directory.indexOf(players.fileName);
        directory.unshift(directory.splice(index, 1)[0]);

        res.render("index", { ...players, ...{ directory: directory } });
    })
    .put(bodyParser.json(), (req, res) => { // PUT request will update players.json attribute of the client's ip with the new HTTP body data
        res.sendStatus(200);
        res.end();

        var clientIp = req.ip;
        if (clientIp.substring(0, 7) == "::ffff:") { // "::ffff:" header signifies IPv4 format
            clientIp = clientIp.substring(7);
        }
        console.log(clientIp);
        console.log(req.body);

        var player = players.known.find(x => x.ip == clientIp);
        if (player != undefined) {
            player.data = req.body;
            io.emit("new data", player);
        } else {
            player = players.unknown.find(x => x.ip == clientIp);
            if (player != undefined) {
                player.data = req.body;
                io.emit("new data", player);
            } else {
                players.unknown.push({ "ip": clientIp, "data": req.body });
                io.emit("new data", { "ip": clientIp, "data": req.body });
            }
        }

        fs.writeFileSync(rosterPath, JSON.stringify(players)); // update the players.json file in real time
    });

app.route("/players/view-player/:deviceNumber")
    .get((req, res) => {

        var player = players.known.find(x => x.deviceNumber == req.params.deviceNumber);
        if (player != undefined) { res.json(player) }
        else {
            console.log("Player not found");
            res.sendStatus(404);
            res.end();
        }
    });

app.route("/players/edit-team")
    .get((req, res) => {
        res.render("edit-team", players);
    })
    .post(bodyParser.urlencoded({ extended: true }), (req, res) => {
        console.log("Edit team request");
        console.log(req.body);

        for (var player of players.known) {
            if (req.body[`${player.deviceNumber}name`]) {
                if (req.body[`${player.deviceNumber}name`] != player.name) {
                    player.name = req.body[`${player.deviceNumber}name`];
                    console.log(`Player #${player.deviceNumber} name change accepted`);
                }
                delete req.body[`${player.deviceNumber}name`];
            }
            if (req.body[`${player.deviceNumber}number`]) {
                if (req.body[`${player.deviceNumber}number`] != player.number) {
                    player.number = req.body[`${player.deviceNumber}number`];
                    console.log(`Player #${player.deviceNumber} number change accepted`);
                }
                delete req.body[`${player.deviceNumber}number`];
            }
        }
        if (Object.keys(req.body).length !== 0) {
            console.log("Some players not found!");
        }

        fs.writeFileSync(rosterPath, JSON.stringify(players)); // update the players.json file in real time
        res.render("index", { ...players, ...{ directory: directory } });
    });

app.route("/players/new-roster")
  .get((req, res) => {
  res.render("new-roster");
}).post(bodyParser.urlencoded({ extended: true }), (req,res)=>{
    
    
    console.log(req.body);
    a = req.body.temp.length;
    console.log(a);
    size = a/4;
    console.log(size);

    var newJSON = {
  "fileName": "",
  "sample": [
    {
      "deviceNumber": "",
      "ip": "420.69.6.9",
      "name": "Grichard Roeneveld",
      "number": "69",
      "data": {
        "maxAcceleration": 696969969696
      }
    }
  ],
  "known": [
    {
      "deviceNumber": "1",
      "ip": "172.18.0.1",
      "name": "First Last",
      "number": "##",
      "data": {
        "maxAcceleration": "none"
      }
    },
    {
      "deviceNumber": "2",
      "ip": "ipAddress1",
      "name": "First Last",
      "number": "##",
      "data": {
        "maxAcceleration": "none"
      }
    },
    {
      "deviceNumber": "3",
      "ip": "ipAddress2",
      "name": "First Last",
      "number": "##",
      "data": {
        "maxAcceleration": "none"
      }
    }
  ],
  "unknown": [],
  "_locals": {}
}
    
    for (let i = 0; i < size; i++){
      for(let i = 0; i < 4; i++){
        
      }
    }
    fs.appendFile(req.body);
})

/*
app.route("/players/edit-devices")
    .get((req, res) => {
        res.render("edit-devices", devices);
    })
    .post(bodyParser.urlencoded({ extended: true }), (req, res) => {
        console.log("Request to add player");
        console.log(req.body);
        var newDevices = Array(0);
        
        for (var player of players.known) {
            var deviceNumber = player.deviceNumber;
            var exists = false;

            if (req.body[`${deviceNumber}deviceNumber`]) {
                exists = true;
                if (req.body[`${deviceNumber}deviceNumber`] != deviceNumber) {
                    player.deviceNumber = req.body[`${deviceNumber}deviceNumber`];
                    console.log(`Player #${deviceNumber} deviceNumber change accepted`);
                }
                delete req.body[`${deviceNumber}deviceNumber`];

            }
            if (req.body[`${deviceNumber}ip`]) {
                exists = true;
                if (req.body[`${deviceNumber}ip`] != player.ip) {
                    var i = players.unknown.findIndex(x => x.ip == newPlayer.ip);
                    if (i != -1) {
                        player.data = players.unknown[i].data;
                        players.unknown.splice(i, 1);
                    }
                    player.ip = req.body[`${deviceNumber}ip`];
                    console.log(`Player #${deviceNumber} ip change accepted`);
                }
                delete req.body[`${deviceNumber}ip`];
            }
            if (exists) {
                newDevices.push({ ...player });
            } else {
                console.log(`Removing player #${deviceNumber}`)
            }
        }

        for (var i = 0; i < Object.keys(req.body).length/2; i++) {
            var key = Object.keys(req.body)[0];
            var deviceNumber = parseInt(key);
            var newPlayer = {
                deviceNumber: req.body[`${deviceNumber}newDeviceNumber`],
                ip: req.body[`${deviceNumber}newIp`],
                name: "First Last",
                number: "##"
            };
            var i = players.unknown.findIndex(x => x.ip == newPlayer.ip);
            if (i != -1) {
                newPlayer.data = players.unknown[i].data;
                players.unknown.splice(i, 1);
            } else {
                newPlayer.data = { maxAcceleration: "none" }
            }

            delete req.body[`${deviceNumber}newDeviceNumber`];
            delete req.body[`${deviceNumber}newIp`];
            console.log("Adding player:");
            console.log(newPlayer);
            newDevices.push({ ...newPlayer });
        }

        players.known = newDevices;

        fs.writeFileSync(rosterPath, JSON.stringify(players)); // update the players.json file in real time
        res.render("index", { ...players, ...{ directory: directory } });
    });
*/

app.route("/players/edit-devices")
    .get((req, res) => {
        res.render("edit-devices-test", { devices: devices });
    })
    .post(bodyParser.urlencoded({ extended: true }), (req, res) => {
        console.log("Request to add player");
        console.log(req.body);

        

    });

app.route("/*")
    .all((req, res) => {
        res.sendStatus(404);
    });

//WEBSOCKETS CODE

var server = app.listen(port, () => {
    console.log(`app listening on port ${port}`);
});

var io = socketio(server);

io.on('connection', (socket) => {
    console.log('Client connected to the WebSocket');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
})