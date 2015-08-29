var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var storage = require('node-persist');
var net = require('net'); // Load the TCP Library


var http_port = 3000;
var ip;
var client_ip, client_port;
storage.initSync();
storage.clear();
var new_c = {arduino : {ip : 'ip', port : 'port'}, user : {ip : 'ip', port : 'port'}};
storage.setItem('5', new_c);

// Aquesta funcio es crida quan sestableix la connexio per primera 
// vegada o es fa un keep alive
app.get('/', function(req, res){
	console.log("New connection");
	var client_info={};
	client_info.ip = req.ip.substring(7, req.ip.length);
	client_info.port = req.connection.remotePort;
	
	// req.query es un objecte construit amb tots els parametres que es
	// passin per url aixi:
	// ip:port/?parametre1=valor1&parametre2=valor2
	var client_id = req.query.clientId; 
	var client_type = req.query.clientType;
	var message = req.query.message;
	send_message_to_arduino(message, client_id);
	// a storage es guarda {client_id : {arduino : {ip : xxx.xxx.xxx.xxx, port : xxxx}, user : {ip : xxx.xxx.xxx.xxx, port : xxxx}}}
	if(client_type == 'arduino') {
		var new_client = {'arduino' : client_info};
		var client = storage.getItem(client_id);
		if(client && client.user) {
			new_client.user = client.user;
		}
		new_client.arduino = client_info;
		storage.setItem(client_id,new_client);
	}
	else if (client_type == 'user') {
		var new_client = {'user' : client_info};
		var client = storage.getItem(client_id);
		if(client && client.arduino) {
			new_client.arduino = client.arduino;
		}
		new_client.user = client_info;
		storage.setItem(client_id,new_client);
	}
	else {
		// TODO: Deal with it
	}
	print_storage();
	
	console.log('Connection from ' + client_ip + ':' + client_port + '. User id: ' + req.query.clientId);
});

io.on('connection', function(socket){
	
	socket.on('GET', function(msg){
		console.log('key pressed: ' + msg);
	});
	/*socket.on('key click', function(msg){
		console.log('key clicked: ' + msg);
		robot.press(msg).release(msg).go();
	});*/
	
	socket.on('key press', function(msg){
		console.log('key pressed: ' + msg);
	});
	socket.on('key release', function(msg){
		console.log('key released: ' + msg);
	});
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
});

http.listen(http_port, function(){
  console.log('listening for http requests on *:' + http_port);
});

function print_storage() {
	console.log("ADDRESSES TABLE");
	console.log("Number of entries:" + storage.length());
	console.log("--------------------------");
	var i;
	for(i = 0; i < storage.length(); i++) {
			var client_id = storage.key(i);
			var client_info = storage.getItem(client_id);
			
			console.log("User: " + client_id);
			console.log(client_info);
	}
	console.log("--------------------------");
}


// Dealing with arduino connections

// Keep track of the chat clients
var clients = [];
var tcp_port = 3001;

// Start a TCP Server
var server = net.createServer(function (socket) {
  // Identify this client
  socket.name = socket.remoteAddress + ":" + socket.remotePort;
  console.log(socket.name + "connected");

  
  //broadcast(socket.name + " joined the chat\n", socket);

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
	data = data.toString();
	var code = data.split(" ")[0];
	switch (code) {
		case "THISIS":
			var id = data.split(" ")[1];
			for(var i = clients.length - 1; i >= 0; i--) {
				if(clients[i].id === id) {
				   clients.splice(i, 1);
				}
			}
			socket.id = id;
			// Send a nice welcome message and announce
			socket.write("Welcome " + socket.name + "with id" + id + "\n");
			clients.push(socket);
		default:
			console.log("Error: Received " + data);
	}
	console.log(clients);
    broadcast(socket.name + "> " + data, socket);
  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    clients.splice(clients.indexOf(socket), 1);
    broadcast(socket.name + " left the chat.\n");
  });
  
  // Send a message to all clients
  function broadcast(message, sender) {
    clients.forEach(function (client) {
      // Don't want to send it to sender
      if (client === sender) return;
      client.write(message);
    });
    // Log it to the server output too
    process.stdout.write(message)
  }
  
  
  
  function digues_aixo(pos_aixo) {
	  console.log(pos_aixo);
  }

});

server.listen(tcp_port, function() {
  // Put a friendly message on the terminal of the server.
  console.log("TCP server running at port *" + tcp_port );
});

function send_message_to_arduino(message, sender_id) {
	console.log("User " + sender_id + " is trying to send message " + message);
	clients.forEach(function (client) {
		// Don't want to send it to sender
		if (client.id === sender_id) {
			client.write(message);
			console.log("message send to arduino " + sender_id + ":" + message);
		}
	});
}



