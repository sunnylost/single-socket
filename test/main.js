var socket = new SingleSocket,
    result = document.getElementById( 'result' )

socket.on( 'connect', function() {
    result.innerHTML += 'Connect<br>'
} )

socket.on( 'ok', function() {
    result.innerHTML += 'Great!<br>'
} )

socket.on( 'message', function( data ) {
    console.log( data )
    result.innerHTML += data.msg + '<br>'
    document.title = data.msg + parseInt( Math.random() * 100 )
} )

function hello() {
    socket.emit( 'hello' )
}

function clearID() {
    localStorage.removeItem( 'single-socket-id' )
}
