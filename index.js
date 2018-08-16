var express =  require('express');
var app = express();
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var server = require('http').Server(app);
var io = require('socket.io')(server);  
var connectedUsers = {};

let raffles = [];

app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
    app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    app.use(methodOverride());

app.get('/', (req, res)=>{
    res.sendFile('./public/index.html'); 
});

server.listen(3000, () =>{
    console.log('I´m running');
});

io.on('connection', (socket) => {
 
    socket.on('createRaffle', (userName) => {

        let raffle = {};

        raffle.name =  userName.raffle;
        raffle.id = socket.id;
        raffle.users = [];
        raffles.push(raffle);

        io.to(socket.id).emit('createdRaffle', {raffleId: userName.raffle, msg:'you created a raffle'}); 
    });

    socket.on('enterRaffle', (data) => {

        let raffleUser = {};
        let raffle = raffles.find(raffle =>{
            return raffle.name == data.raffle;  
        })

        if(raffle == null){
            io.to(socket.id).emit('raffleNotFound');
        }
        else{

            let user = raffle.users.find(user => {
                return user.userName == data.user;
            });

            if(user != null){
                io.to(socket.id).emit('userLogged');
            }
            else{
                raffleUser.socketId = socket.id;
                raffleUser.userName = data.user;
                raffle.users.push(raffleUser);
        
                let raffleUsers = Array.prototype.map.call(raffle.users, item => item.userName);
                io.to(raffle.id).emit('enteredRaffle', raffleUsers );
                io.to(socket.id).emit('enteredRaffleUser');
            }
        }
    });

    socket.on('raffleWinners', (data) => {

        let raffle = raffles.find(raffle =>{
            return raffle.name == data.raffle;  
        })
        
        raffle.users.forEach(user=>{
            io.to(user.socketId).emit(user.userName == data.user ? 'win' : 'loose');
        })

    });

    socket.on('disconnect',()=>{

          for(let i=0; i < raffles.length; i++){
            if(raffles[i].id === socket.id){
                raffles.splice(i,1); 
            }
          }

          io.emit('exit',raffles); 
    });

});