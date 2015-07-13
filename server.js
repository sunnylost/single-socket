var http         = require( 'http' ),
    io           = require( 'socket.io' ),
    util         = require( 'util' ),
    express      = require( 'express' ),
    errorhandler = require( 'errorhandler' ),
    port         = 12345,
    count        = 0,
    app, server, socket

//Upgraded for express 3.x
app = express()

util.log( 'current path: ', __dirname )
app.use( express.static( __dirname ) )
app.use( errorhandler( { showStack: true, dumpExceptions: true } ) )

//socket requires a http server
server = http.createServer( app ).listen( port )
socket = io( server )
util.log( 'Started server on http://localhost:' + port + '/' )

socket.on( 'connection', function( client ) {
    var connected = true

    util.log( '====================Connect client num:' + ++count )

    //On receiving the message event - echo to console
    client.on( 'message', function( m ) {
        util.log( 'Message received: ' + m )
    } )

    client.emit( 'message', {
        msg: 'First Connect'
    } )

    client.on( 'disconnect', function() {
        connected = false
        count--
    } )

    client.on( 'hello', function() {
        client.emit( 'message', {
            msg: 'sunny' + Math.random()
        } )
    } )
} )
