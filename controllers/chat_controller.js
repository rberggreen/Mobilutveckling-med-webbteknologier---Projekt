ChatController = function(model, mainController, view) {

	this.printMessages = function() {
		var message = model.getMessages();
		console.log(message);
		$("#messageGrid").append(this.styleMessage(message));
	}
	
	this.update = function(msg) {
		if (msg === "test")	view.append("<p>test update</p>");
		if (msg == "newMessage") this.printMessages();
		if (msg == "newChannel"){
			$("#messageGrid").html('');
			$("#currentRoom").empty();
			$("#currentRoom").append("<p>"+model.currentChannel+"</p>");
			model.subscribeToChat();
			model.getChatHistory();
		}
	}
	
	this.styleMessage = function(message){
		var name = "<div class ='userInfo'><a href='#popUpView' data-rel='popup' data-transition='pop'><p class='ui-block-a' style = 'width: 30%; !important; color:"+message.textColor+"'>"+message.alias+"</p></a></div>";
		var msg = "<small class='ui-block-b' >"+message.chatMsg+"</small>";
		return name+msg;
	}

	/**$(document).on("pageshow", "#chatView", function() {
		model.initChat();
		model.subscribeToChat();
	});**/
	
	$("#textInput").keyup(function(event){
		if(event.keyCode == 13){
			$("#sendMsg").click();
		}
	});
	
	$("#sendMsg").click(function(event){
		var msg = $("#textInput").val();
		model.sendMessage(msg);
		$("#textInput").val('');
	});
	
	model.subscribe(this);
}