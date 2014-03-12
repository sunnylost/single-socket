var http    = require('http'), 
    io      = require('socket.io'),
    sys     = require('sys'),
    express = require('express');

var port = 8080;

//Upgraded for express 3.x
var app = express();
app.use(express.static(__dirname + '/public'));
app.use(express.errorHandler({showStack: true, dumpExceptions: true}));

//socket requires a http server
var socket = io.listen(http.createServer(app).listen(port));
sys.log('Started server on http://localhost:' + port + '/')


var count = 0;

socket.sockets.on('connection', function(client){
  var connected = true;

  sys.log('====================Connect client num:' + ++count)

  //On receiving the message event - echo to console
  client.on('message', function(m){
    sys.log('Message received: '+m);
  });

  client.emit('message', {
    msg: 'First Connect'
  })

  client.on('disconnect', function(){
    connected = false;
    count--;
  });

  client.on('hello', function() {
  	//client.send('haha'); //not obj
  	client.emit('message', {
  		msg: 'sunny'
  	})
  })
});

