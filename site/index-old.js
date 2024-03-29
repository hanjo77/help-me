var quickconnect = require('rtc-quickconnect');
var captureConfig = require('rtc-captureconfig');
var media = require('rtc-media');
var crel = require('crel');
var qsa = require('fdom/qsa');
var tweak = require('fdom/classtweak');
var reRoomName = /^\/room\/(.*?)\/?$/;
var room = location.pathname.replace(reRoomName, '$1').replace('/', '');

// local & remote video areas
var local = qsa('.local')[0];
var remotes = qsa('.remote');
var myLatLong = null;
if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(function showPosition(position) {
		myLatLong = [position.coords.latitude, position.coords.longitude]; 
	});
}

// get the message list DOM element
var messages = qsa('#messageList')[0];
var chat = qsa('#commandInput')[0];

// data channel & peers
var chatChannel, geoChannel;
var peerMedia = {};

var geoCoords = {};

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

// capture local media
var localMedia = media({
	constraints: captureConfig('camera min:640x480').toConstraints()
});

// render a remote video
function renderRemote(id, stream) {
	var activeStreams;

	// create the peer videos list
	peerMedia[id] = peerMedia[id] || [];

	activeStreams = Object.keys(peerMedia).filter(function(id) {
		return peerMedia[id];
	}).length;

	console.log('current active stream count = ' + activeStreams);
	peerMedia[id] = peerMedia[id].concat(media(stream).render(remotes[activeStreams % 2]));
}

function removeRemote(id) {
	var elements = peerMedia[id] || [];

	// remove old streams
	console.log('peer ' + id + ' left, removing ' + elements.length + ' elements');
	elements.forEach(function(el) {
		el.parentNode.removeChild(el);
	});
	geoCoords[id] = undefined;
	peerMedia[id] = undefined;
}

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
	.addStream(stream)
	.createDataChannel('chat')
	.createDataChannel('coords')
	.on('stream:added', renderRemote)
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
			console.log(geoCoords);
		};
		geoChannel = dc;
		if (myLatLong) {
			geoChannel.send('{"id": "' + id + '", "pos": [' + myLatLong + ']}');	
		}
		console.log('coord channel open for peer: ' + id);
	});
});

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
