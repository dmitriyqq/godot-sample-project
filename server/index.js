var express = require('express')
const WebSocket = require('ws');
const gdCom = require('@gd-com/utils')
const fetch = require('node-fetch');
var mongoose = require('mongoose');
const sql = require('mssql')

mongoose.connect('mongodb://root:example@localhost/admin');

const ENTER_REGULATOR = 30;
const EXIT_REGULATOR = 11;

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('connected mongoose')
});

async function poll_updates_from_prism(){
    await sql.connect('mssql://PortalLogReader:7BDq5O6mv2@10.0.0.129/PassFace_Repl')
    const result = await sql.query`select * from mytable where id = ${value}`
    console.dir(result)
}

setInterval(() => {
    poll_updates_from_prism();
}, 60 * 1000)

const PRISM_URL = "http://prism/api/employees/all"

const PositionSchema = new mongoose.Schema({ x: Number, y: Number, z: Number });

const RoomSchema = new mongoose.Schema({
    name: String,
    position: PositionSchema,
});

const RoomModel = mongoose.model('Room', RoomSchema);

var persons = []
var room_names = new Set()

// Фичи сервера:
// 1. При старте сервера мы должны найти всех кто на этаже и посадить их по своим комнатам
// 2. Когда нам приходит инфа с камеры, мы должны найти наиболее подходящего чувака и послать его куда направляет камера
// 3. Когда человек уходит с этажа мы отправляем его на выход

async function persist_rooms_users_list(){
    try {


        console.log('persisting rooms state');
        const resp = await fetch(PRISM_URL);
        const employee_list = await resp.json();
        // console.log(json)
        for (const employee of employee_list) {
            const {Id, Dislocation, InBuilding, Login, FirstName, LastName} = employee;
            if (InBuilding) {
                persons.push({id: Id, home: Dislocation, inBuilding: InBuilding, login: Login, last_location: Dislocation, first_name: FirstName, last_name: LastName})
            }
            room_names.add(Dislocation)
        }
    } catch (error){
        console.error(error);
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
var app = express()
app.use(express.json())

const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', async ws => {
    console.log('connected')
    ws.on('message', (message) => {
      let recieve = new gdCom.GdBuffer(Buffer.from(message))
      console.log(recieve.getVar())
    })

    for (const person of persons){
        console.log('sending ', person)
        // ws.send(JSON.stringify({event_type: 'load_person', person}))
        let buffer = new gdCom.GdBuffer()
        buffer.putString(JSON.stringify({event_type: 'load_person', person}))
        ws.send(buffer.getBuffer())
        await delay(5000);
    }
})

app.get('/persons', async (req, res) => {
    res.json(persons)
})

app.get('/rooms', async (req, res) => {
    var rooms = await RoomModel.find({});
    res.json(rooms)
})

app.get('/room_names', async (req, res) => {
    res.json(['kitchen', 'exit', ...Array.from(room_names)])
})

app.post('/rooms', async (req, res) => {
    try {
        const {name, position} = req.body;
        console.log({name, position});
        const new_room = RoomModel.create({name, position});
        res.json({ok: true, new_room});
    } catch (error) {
        res.status(400).json(error);
    }
})


app.post('/cam', function (req, res) {
    console.log(req.body.cam_id)
    console.log(req.body.room_id)
    res.json({ok: true})
})

app.post('/person/:id/home', function (req, res) {
    console.log(req.params.id);
    print(req.body.position)
    res.json({ok: true})
})

app.post('/person/:id/location', function (req, res) {
    try {
        console.log(req.params.id);
        print(req.body.position)
        updatePersonLocation()
        res.json({ok: true})
    } catch (error) {
        console.log(error)
    }
})

app.listen(3000)

async function updatePersonLocation(personId, location) {
    const person = persons.find(p => p.id == personId);
    persons.last_location = location;
    wss.clients.forEach(ws => {
        let buffer = new gdCom.GdBuffer()
        buffer.putString(JSON.stringify({event: 'change_loc', person_id: personId, location}))
        buffer.putVar(Math.random())
        ws.send(buffer.getBuffer())
        client.send()
    })
}

persist_rooms_users_list();

app.get('/ping', function (req, res) {
    res.json({pong: 'pong'})
})