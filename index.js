"use strict"

const express = require("express");
const socketio = require("socket.io");
var bodyParser = require('body-parser');
const fs = require("fs");
const path = require("path");

var directory = fs.readdirSync("./rosters");
let rosterPath = `rosters/${directory[0]}`;

var players = JSON.parse(fs.readFileSync(rosterPath));
var devices = JSON.parse(fs.readFileSync('devices.json'));


var index = directory.indexOf(players.fileName);
directory.unshift(directory.splice(index, 1)[0]);
console.log(directory);

var app = express();
var port = 443;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

let now = Date.now();
console.log(now);

let string = new Date(now).toDateString();
console.log(string);

//EXPRESS ROUTES

app.route("/")
    .get((req, res) => { // main page
        res.render("index", { ...players, ...{ directory: directory } });
      
    }).post(bodyParser.urlencoded({ extended: true }), (req, res) => {
        console.log("Client has requested to delete a roster");
        console.log(req.body);
        
        fs.unlinkSync(`./rosters/${req.body.rosterName}`);//armon

        directory = fs.readdirSync("./rosters");
        
        rosterPath = `rosters/${directory[0]}`;//armon this is what u did!!!!
      
        players = JSON.parse(fs.readFileSync(rosterPath));
        index = directory.indexOf(players.fileName);
        directory.unshift(directory.splice(index, 1)[0]);
      
        res.render("index", { ...players, ...{ directory: directory } });
    });

app.route("/players") // path for interacting with the players.json file
    .get((req, res) => { // GET request will receive the players.json file
        res.json(players);
    })
    .post(bodyParser.urlencoded({ extended: true }), (req, res) => {
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
        //this is where you add stuff armon
        req.body.time = Date.now()
      
        if (devices[clientIp]) {
            var deviceNumber = devices[clientIp];
            players.known[deviceNumber].data = req.body;
        } else {
            players.unknown[clientIp] = req.body;
        }

        io.emit("new data", players);

        fs.writeFileSync(rosterPath, JSON.stringify(players)); // update the players.json file in real time
    });

app.route("/players/view-player/:deviceNumber")
    .get((req, res) => {
        if (players.known[req.params.deviceNumber]) {
            res.json(players.known[req.params.deviceNumber]);
        } else {
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
        console.log("Edit team request accepted");
        console.log(req.body);

        for (const deviceNumber in req.body) {
            if (players.known[deviceNumber]) {
                players.known[deviceNumber].name = req.body[deviceNumber][0];
                players.known[deviceNumber].number = req.body[deviceNumber][1];
            }
        }

        io.emit("new data", players);

        fs.writeFileSync(rosterPath, JSON.stringify(players)); // update the players.json file in real time

        res.render("index", { ...players, ...{ directory: directory } });
    });

app.route("/players/new-roster")
    .get((req, res) => {
        res.render("new-roster", { devices: devices, directory: directory });
      
    }).post(bodyParser.urlencoded({ extended: true }), (req, res) => {
        console.log("request to add roster");
        console.log(req.body);

        if (directory.find(x => x == req.body.rosterName) != undefined) {
          console.log("Client attempted to make roster with duplicate name");
          res.status(400).send("Roster Name already exists!");
          res.end();
          return;
        }

        var newRoster = {
          fileName: req.body.rosterName,
          sample: {
            deviceNumber: {
              name: "First Last",
              number: "##",
              data: {
                maxAcceleration: "none"
              }
            }
          },
          known: {},
          unknown: {},
          locals: {}
        };
      
        for (var deviceNumber in req.body) {
          if (deviceNumber == "rosterName") {
              continue;
          }

          newRoster.known[deviceNumber] = {
            name: req.body[deviceNumber][0],
            number: req.body[deviceNumber][1],
            data: {
              maxAcceleration: "none"
            }
          };
        }

        fs.writeFileSync(`rosters/${req.body.rosterName}`, JSON.stringify(newRoster)); // update the players.json file in real time
        directory = fs.readdirSync("./rosters");
        rosterPath = `rosters/${req.body.rosterName}`;
        players = JSON.parse(fs.readFileSync(rosterPath));
        index = directory.indexOf(players.fileName);
        directory.unshift(directory.splice(index, 1)[0]);
        console.log(directory);
        res.render("index", { ...players, ...{ directory: directory } });
    })

app.route("/players/edit-devices")
    .get((req, res) => {
        res.render("edit-devices", { devices: devices });
    })
    .post(bodyParser.urlencoded({ extended: true }), (req, res) => {
        console.log("Request to edit devices");
        console.log(req.body);

        devices = {};
        for (var i = 0; i < req.body.ip.length; i++) {
            devices[req.body.ip[i]] = req.body.deviceNumber[i];
        }
        fs.writeFileSync("devices.json", JSON.stringify(devices));

        for (var i = 0; i < directory.length; i++) {
            var roster = JSON.parse(fs.readFileSync("rosters/" + directory[i]));
            var newRoster = {};

            for (var ip in devices) {
                var deviceNumber = devices[ip];

                if (roster.known[deviceNumber]) {
                    newRoster[deviceNumber] = roster.known[deviceNumber];

                } else {
                    console.log("adding new player");
                    newRoster[deviceNumber] = {
                        name: "First Last",
                        number: "##",
                        data: {
                            maxAcceleration: "none"
                        }
                    };
                }

                for (var address in roster.unknown) {
                    if (ip == address) {
                        newRoster[deviceNumber].data = roster.unknown[address];
                        delete roster.unknown[address];
                    }
                }
            }
            roster.known = { ...newRoster };
            fs.writeFileSync("rosters/" + directory[i], JSON.stringify(roster));
        }

        players = JSON.parse(fs.readFileSync(rosterPath));

        io.emit("new data", players);

        res.render("index", { ...players, ...{ directory: directory } });
    });

app.route("/players/history").get((req,res)=>{
  res.render("history-by-name", players);
});

app.route("/players/history-by-time").get((req,res) => {
  res.render("history-by-time", players);
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