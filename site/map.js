var ctaLayer, center, zoom, infoWindow, startHtml;

$(window).resize(setMapSize);

function initialize() {
	
	var home = null;
	var mapOptions = {
		
		mapTypeId: google.maps.MapTypeId.HYBRID
	}
	
	if (myLatLong) {
		
		mapOptions.zoom = 20;
		mapOptions.center = new google.maps.LatLng(myLatLong[0], myLatLong[1]);
	}
	else {
		
		mapOptions.zoom = 8;
		mapOptions.center = new google.maps.LatLng(46.9583,7.4361);
	}

	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

	google.maps.event.addListener(ctaLayer, 'click', function (kmlEvent) {
		console.log(kmlEvent);
	});				  

	google.maps.event.addListener(map, 'mouseover', function (kmlEvent) {
		console.log(kmlEvent);
	});				  

	setMapSize();
}

google.maps.event.addDomListener(window, 'load', initialize);

function setMapSize() {
	
	$("#map-canvas").css({
		
		width: $(window).innerWidth(),
		height: $(window).innerHeight()
	});
}

function reset() {
	
	map.setZoom(zoom);
	map.setCenter(center);
}

function zoomTo(coords) {

	zoom = map.zoom;
	center = map.center;
	var pos = new google.maps.LatLng(coords[0], coords[1]);
	map.setZoom(coords[2]);
	map.setCenter(pos);
}
