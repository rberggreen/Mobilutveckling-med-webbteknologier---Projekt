Message = function(chatMsg, alias, textColor, profileImage) {
	this.chatMsg = chatMsg;
	this.alias = alias;
	this.textColor = textColor;
	this.profileImage = profileImage;
}

User = function(alias, profileImage, name, textColor){
	this.alias = alias;
	this.profileImage = profileImage;
	this.name = name;
	this.textColor = textColor;
}

Model = function() {
	this.observers = [];
	this.accessToken = "";
	this.loggedIn = false;
	this.loggedIn = false;
	this.nearbyMedia = [];
	this.locationIDs = null;

	//For chat
	this.user;
	this.currentFilter = "";
	this.newMessage;
	this.chatChannel;
	
	var model = this;

	this.test = function() {
		console.log("test");
		this.notifyObservers("test");
	}
	
	this.subscribe = function(controller) {
		this.observers.push(controller);
	}
	
	this.notifyObservers = function(msg) {
		for (var i in this.observers) {
			this.observers[i].update(msg);
		}
	}

	this.cameFromInstagramLogin = function() {
		if (window.location.hash === "") {
			return false;
		} else {
			return true;
		}
	}

	this.getAccessTokenFromUrl = function() {
		if(window.location.hash !== "") {
			this.accessToken = window.location.hash;
			this.accessToken = this.accessToken.substring(this.accessToken.indexOf("=") + 1);
			this.loggedIn = true;
			console.log("gotAccessToken");
			this.notifyObservers("gotAccessToken");
		}
	}

	this.getHttp = function(url, successFunction) {
		$.ajax({
			'type': 'GET',
			'dataType': 'jsonp',
			'cache': false,
			'url': url,
			'success': function(data) {
				successFunction(data);
			},
			'error': function(xhr, status, error) {
				model.getHttpError(error);
			}
		});
	}

	this.getHttpError = function(error) {
		console.log(error);
	}

	this.loadLocationIDs = function(position, distance) {
		var latitude = position.A;
		var longitude = position.F;
		if (!distance) var distance = 1000;
		this.getHttp("https://api.instagram.com/v1/locations/search?lat=" + latitude + "&lng=" + longitude + "&distance=" + distance + "&access_token=" + this.accessToken, 
			function(data) {
				model.locationIDs = data;
				model.notifyObservers("gotLocationIDs");
				model.loadNearbyMedia();
			}
		);
	}

	this.loadMediaFromLocations = function() {
		console.log(this.locationIDs.data.length);
		for (var i = 0; i < this.locationIDs.data.length; i++) {
			var locationID = this.locationIDs.data[i].id;
			this.getHttp("https://api.instagram.com/v1/locations/" + locationID + "/media/recent?access_token=" + this.accessToken,
				function(data) {
					model.nearbyMedia.push(data);
					model.notifyObservers("gotNearbyMedia");
				}
			);
		}
	}

	this.loadNearbyMedia = function(position, callNumber, maxTimestamp) {
		// Hämtar bilder från Instagram tagna på angiven position och sparar dem i modellen
		var latitude = position.A;
		var longitude = position.F;
		var distance = 500;

		var callNumber = callNumber ? callNumber : 0; // om callNumber ej är angivet, sätt callNumber till 0

		if (callNumber <= 3) { // kör endast funktionen upp till ett visst körnummer
			this.getHttp("https://api.instagram.com/v1/media/search?lat=" + latitude + "&lng=" + longitude + "&distance=" + distance + "&max_timestamp=" + maxTimestamp + "&access_token=" + this.accessToken,
				function(data) {
					model.nearbyMedia.push(data); // spara bunten med hittade bilder
					model.notifyObservers("gotNearbyMedia");
					var oldestTimestamp = data.data[data.data.length - 1].created_time; // den sista bilden i arrayen har det äldsta datumet
					model.loadNearbyMedia(position, callNumber + 1, oldestTimestamp); // kör funktionen igen rekursivt fr.o.m. det äldsta hittade datumet
				}
			);
		}
	}

	this.getLatestNearbyMedia = function() {
		return this.nearbyMedia[this.nearbyMedia.length - 1];
	}

	this.getUserInfo = function() {
		var textColor = this.randomColorGenerator();
		this.getHttp("https://api.instagram.com/v1/users/self/?access_token=" + this.accessToken,
			function(data) {
					this.user = new User(data.data.username, data.data.profile_picture, data.data.full_name, textColor);
				}
			);
	}
	
	this.randomColorGenerator = function() {
		var letters = '0123456789ABCDEF'.split('');
		var color = '#';
		for (var i = 0; i < 6; i++ ) {
			color += letters[Math.floor(Math.random() * 16)];
		}
		return color;
	}
	
	//Function that init PUBNUB chat
	this.initChat = function(){
		this.chatChannel = PUBNUB.init({
			publish_key: 'pub-c-c9b9bd43-e594-4146-b78a-716088b91de8',
			subscribe_key: 'sub-c-ee7c4d30-e9ba-11e4-a30c-0619f8945a4f',
			uuid: this.alias
		});
	}
	
	this.getMessages = function() {
		return this.newMessage;
	}
	
	//Function that subscribes to a specific chat channel
	this.subscribeToChat = function(){
		if(this.currentFilter == ""){
				this.currentFilter = "59.34045571 18.03018451"; 	//REMOVE LATER 
		}
		
		this.chatChannel.subscribe({
		      channel: this.currentFilter,
		      message: function(m){
					model.newMessage = m;
					model.notifyObservers("newMessage");
			  },
		      connect: function(){console.log("Connected"); subscribed = true},
		      disconnect: function(){console.log("Disconnected")},
		      reconnect: function(){console.log("Reconnected")},
		      error: function(){console.log("Network Error")},
	 	});		
	}
	
	//Function for sending message in chat
	this.sendMessage = function(chatMsg) {
		this.chatChannel.publish({channel: this.currentFilter, message : new Message(chatMsg, user.alias, user.textColor, user.profileImage)});
	}
	
	//Function for unsubscribing from a chat channel
	this.leaveChat = function(){
		PUBNUB.unsubscribe({
			channel: this.currentFilter,
		});
	}

	this.getMap = function(latitude, longitude, zoom, view) {
		// Tar emot lat, long, zoom och DOM-element. Skapar karta, returnerar kartan, infogar kartan i elementet. 
		var mapOptions = {
			center: {lat: latitude, lng: longitude},
			zoom: zoom,
			mapTypeId: google.maps.MapTypeId.google_earhtview,
			disableDefaultUI: true
		};

		var map = new google.maps.Map(view, mapOptions);

		return map;
	}

	this.addMarker = function(map, position, image) {
		// Tar emot en karta, ett positionsobjekt och en bild. Lägger till bilden på den positionen i den kartan. 
		if (image) {
			new google.maps.Marker({
				map: map, 
				position: position,
				draggable: true,
				icon: image
			});
		} else {
			new google.maps.Marker({
				map: map, 
				position: position,
				draggable: true,
			});
		}
		
	}
}
