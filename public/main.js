var socket = SingleSocket.connect();

socket.on('connect', function(){
	result.innerHTML += 'Connect<br>';
});

socket.on('ok', function(m){
  result.innerHTML += 'Great!<br>';
});

socket.on('message', function(data) {
	console.log(data);
	result.innerHTML += data.msg + '<br>';
})

function hello() {
	socket.emit('hello')
}

function clearID() {
	localStorage.removeItem('single-socket-id');
}