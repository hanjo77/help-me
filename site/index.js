var quickconnect = require('rtc-quickconnect');
var captureConfig = require('rtc-captureconfig');
var media = require('rtc-media');
var crel = require('crel');
var qsa = require('fdom/qsa');
var tweak = require('fdom/classtweak');
var reRoomName = /^\/room\/(.*?)\/?$/;
var room = location.pathname.replace(reRoomName, '$1').replace('/', '');
var connection;
var connectedId;

// local & remote video areas
var local = qsa('.local')[0];
var remotes = qsa('.remote');
if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(function showPosition(position) {
		myLatLong = [position.coords.latitude, position.coords.longitude];
		if (map) {
			
			map.setCenter(new google.maps.LatLng(myLatLong[0], myLatLong[1]));
			map.setZoom(20);
		}
	});
}

// get the message list DOM element
var messages = qsa('#messageList')[0];
var chat = qsa('#commandInput')[0];

// data channel & peers
var chatChannel, geoChannel;
var peerMedia = {};
var markers = {};
var streams = {};
var names = {};

$("#submitName").click(function(evt) {
	
	userName = $("#userName").val();
	$("#start").css({ display: "none" });
	startApp();
});

$(".container").click(function(evt) {
	
	$(".container").css({ display: "none" });
	if (connectedId) {
		
		removeRemote(connectedId);
		connectedId = null;
	}
});

// use google's ice servers
var iceServers = [
	{ url: 'stun:stun.l.google.com:19302' }
	// { url: 'turn:192.158.29.39:3478?transport=udp',
	//	 credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
	//	username: '28224511:1379330808'
	// },
	// { url: 'turn:192.158.29.39:3478?transport=tcp',
	//	 credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
	//	 username: '28224511:1379330808'
	// }
];


function startApp() {

	$("#content").css({ display: "block" });
	// capture local media
	var localMedia = media({
		constraints: captureConfig('camera min:640x480').toConstraints()
	});

	// render our local media to the target element
	localMedia.render(local);

	// once the local media is captured broadcast the media
	localMedia.once('capture', function(stream) {
		// handle the connection stuff
		quickconnect(location.href + '../../', {
			// debug: true,
			room: room,
			iceServers: iceServers
		})
		.createDataChannel('coords')
		.addStream(stream)
		.createDataChannel('chat')
		.on('stream:added', addRemote)
		.on('stream:removed', removeRemote)
		.on('channel:opened:chat', function(id, dc) {
			qsa('.chat').forEach(tweak('+open'));
			dc.onmessage = function(evt) {
				if (messages) {
					messages.appendChild(crel('li', evt.data));
				}
			};

			// save the channel reference
			chatChannel = dc;
			console.log('chat channel open for peer: ' + id);
		})
	
		.on('channel:opened:coords', function(id, dc) {
			dc.onmessage = function(evt) {
				var data = JSON.parse(evt.data);
				geoCoords[data.id] = data.pos;
				names[data.id] = data.name;
				for (var elem in geoCoords) {
		
					var lowest = [];
					var highest = [];
					if (geoCoords[elem]) {
					
						if (!lowest[0] || geoCoords[elem][0] < lowest[0]) {
						
							lowest[0] = geoCoords[elem][0];
						}
						if (!lowest[1] || geoCoords[elem][1] < lowest[1]) {
						
							lowest[1] = geoCoords[elem][1];
						}
						if (!highest[0] || geoCoords[elem][0] > highest[0]) {
						
							highest[0] = geoCoords[elem][0];
						}
						if (!highest[1] || geoCoords[elem][1] > highest[1]) {
						
							highest[1] = geoCoords[elem][1];
						}
						if (!markers[id]) {
						
							markers[id] = new google.maps.Marker({
								icon: "http://hanjo.synology.me/marker-png/marker.php?text=" + data.name,
								position: new google.maps.LatLng(geoCoords[elem][0], geoCoords[elem][1]),
								title:"Hello World!"
							});
							markers[id].rtcId = id;
							markers[id].setMap(map);
							google.maps.event.addListener(markers[id], 'click', openRemote);
						}
					}
				}
				var middle = [lowest[0]+((highest[0]-lowest[0])/2), lowest[1]+((highest[1]-lowest[1])/2)]
			
				map.setCenter(new google.maps.LatLng(middle[0], middle[1]));
				map.setZoom(20);
			};
			geoChannel = dc;
			if (myLatLong) {
				geoChannel.send('{"name": "' + userName + '", "id": "' + id + '", "pos": [' + myLatLong + ']}');	
			}
			console.log('coord channel open for peer: ' + id);
		});
	});	
}

// render a remote video
function renderRemote(id, stream) {
	var activeStreams;

	streams[id] = stream;

	console.log("Strem will display soon");
	// create the peer videos list
	peerMedia[id] = [];

	activeStreams = Object.keys(peerMedia).filter(function(id) {
		return peerMedia[id];
	}).length;

	console.log('current active stream count = ' + activeStreams);
	peerMedia[id] = peerMedia[id].concat(media(stream).render(remotes[activeStreams % 2]));
}

// add a remote video
function addRemote(id, stream) {
	streams[id] = stream;
}

function removeRemote(id, streamOnly) {
	var elements = peerMedia[id] || [];

	// remove old streams
	console.log('peer ' + id + ' left, removing ' + elements.length + ' elements');
	elements.forEach(function(el) {
		el.parentNode.removeChild(el);
	});
	peerMedia[id] = undefined;
	if (streamOnly) {
		
		geoCoords[id] = undefined;
		if (markers[id]) {
		
			markers[id].setMap(null);
		}
	}
	if (connectedId == id) {
		$(".container").css({ display: "none" });
	}
}

function openRemote(evt) {

	if (streams[this.rtcId]) {
		
		removeRemote(this.rtcId);
	}
	console.log(streams);
	console.log("open id " + this.rtcId);
	var stream = streams[this.rtcId];
	renderRemote(this.rtcId, stream);
	connectedId = this.rtcId;
	$(".container").css({ display: "flex" });
}

// handle chat messages being added
if (chat) {
	chat.addEventListener('keydown', function(evt) {
		if (evt.keyCode === 13) {
			messages.appendChild(crel('li', { class: 'local-chat' }, chat.value));
			chat.select();
			if (chatChannel) {
				chatChannel.send(chat.value);
			}
		}
	});
}
