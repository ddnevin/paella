paella.plugins.CommentsPlugin = Class.create(paella.TabBarPlugin,{
	divRoot:null,
	divPublishComment:null,
	divComments:null,
	publishCommentTextArea:null,
	publishCommentButtons:null,
	canPublishAComment: false,
	comments: [],
	commentsTree: [],
	domElement:null,
  
	getSubclass:function() { return "showCommentsTabBar"; },
	getName:function() { return "es.upv.paella.commentsPlugin"; },
	getTabName:function() { return paella.dictionary.translate("Comments"); },
	checkEnabled:function(onSuccess) { onSuccess(paella.extended); },
					     
	action:function(tab) {
		this.loadContent();
	},
			
	buildContent:function(domElement) {
		this.domElement = domElement;
		this.canPublishAComment = paella.initDelegate.initParams.accessControl.permissions.canWrite;
		this.loadContent();
	},
				
	loadContent:function() {
		this.divRoot = this.domElement;
		this.divRoot.innerHTML ="";
		
		this.divPublishComment = document.createElement('div');
		this.divPublishComment.className = 'CommentPlugin_Publish';
		this.divPublishComment.id = 'CommentPlugin_Publish';

		this.divComments = document.createElement('div'); 
		this.divComments.className = 'CommentPlugin_Comments';
		this.divComments.id = 'CommentPlugin_Comments';

		this.divRoot.appendChild(this.divComments);
		
		if(this.canPublishAComment){
			this.divRoot.appendChild(this.divPublishComment);
			this.createPublishComment();
		}
		this.reloadComments();
	},
	
	createPublishComment:function() {
		var thisClass = this;
		var rootID = this.divPublishComment.id+"_entry";
		
		var divEntry;
		divEntry = document.createElement('div');
		divEntry.id = rootID;
		divEntry.className = 'comments_entry';
		
		var divSil;
		divSil = document.createElement('img');
		divSil.className = "comments_entry_silhouette";
		divSil.src = paella.initDelegate.initParams.accessControl.userData.avatar;
		divSil.id = rootID+"_silhouette";
		divEntry.appendChild(divSil);
		
		var divTextAreaContainer;
		divTextAreaContainer = document.createElement('div');
		divTextAreaContainer.className = "comments_entry_container";
		divTextAreaContainer.id = rootID+"_textarea_container";
		divEntry.appendChild(divTextAreaContainer);
		
		this.publishCommentTextArea = document.createElement('textarea');
		this.publishCommentTextArea.id = rootID+"_textarea";
		this.publishCommentTextArea.onclick = function(){paella.keyManager.enabled = false;};
		this.publishCommentTextArea.onblur = function(){paella.keyManager.enabled = true;};
		divTextAreaContainer.appendChild(this.publishCommentTextArea);
		
		this.publishCommentButtons = document.createElement('div');
		this.publishCommentButtons.id = rootID+"_buttons_area";
		divTextAreaContainer.appendChild(this.publishCommentButtons);
		
		var btnAddComment;
		btnAddComment = document.createElement('button');
		btnAddComment.id = rootID+"_btnAddComment";
		btnAddComment.className = "publish";
		btnAddComment.onclick = function(){
			var txtValue = thisClass.publishCommentTextArea.value;
			if (txtValue.replace(/\s/g,'') != "") {
				thisClass.addComment();
			}
		};
		btnAddComment.innerHTML = paella.dictionary.translate("Publish");
		
		this.publishCommentButtons.appendChild(btnAddComment);
		
		divTextAreaContainer.commentsTextArea = this.publishCommentTextArea;
		divTextAreaContainer.commentsBtnAddComment = btnAddComment;
		divTextAreaContainer.commentsBtnAddCommentToInstant = this.btnAddCommentToInstant;
		
		this.divPublishComment.appendChild(divEntry);
	},
		
	addComment:function(){
		var thisClass = this;
		var txtValue = thisClass.publishCommentTextArea.value;
		var now = new Date();
		
		this.comments.push({
			id: paella.utils.uuid(),
			userName:paella.initDelegate.initParams.accessControl.userData.name,
			mode: "normal",
			value: txtValue,
			created: now
		});

		var data = {
			allComments: this.comments
		}
		
		paella.data.write('comments',{id:paella.initDelegate.getId()},data,function(response,status){
			if (status) {thisClass.loadContent();}
		});
	},
	
	addReply:function(annotationID, domNodeId){
		var thisClass = this;
		var textArea = document.getElementById(domNodeId);
		var txtValue = textArea.value;
		var now = new Date();
		
		paella.keyManager.enabled = true;

		this.comments.push({
			id: paella.utils.uuid(),
			userName:paella.initDelegate.initParams.accessControl.userData.name,
			mode: "reply",
			parent: annotationID,
			value: txtValue,
			created: now
		});

		var data = {
			allComments: this.comments
		}
		
		paella.data.write('comments',{id:paella.initDelegate.getId()},data,function(response,status){
			if (status) thisClass.reloadComments();
		});
	},
	
	reloadComments:function() {     
		var thisClass = this;
		thisClass.commentsTree = [];
		thisClass.comments = [];
		this.divComments.innerHTML ="";
		
		paella.data.read('comments',{id:paella.initDelegate.getId()},function(data,status) {
			
			if (data && typeof(data)=='object' && data.allComments.length>0) {
				thisClass.comments = data.allComments;
				var tempDict = {};

				// obtain normal comments  
				for (var i =0; i < data.allComments.length; ++i ){
					var valueText = data.allComments[i].value;
                                                
					if (data.allComments[i].mode !== "reply") { 
						var comment = {};
						comment["id"] = data.allComments[i].id;
						comment["userName"] = data.allComments[i].userName;
						comment["mode"] = data.allComments[i].mode;
						comment["value"] = valueText;
						comment["created"] = data.allComments[i].created;
						comment["replies"] = [];    

						thisClass.commentsTree.push(comment); 
						tempDict[comment["id"]] = thisClass.commentsTree.length - 1;
					}
				}
			
				// obtain reply comments
				for (var i =0; i < data.allComments.length; ++i ){
					var valueText = data.allComments[i].value;

					if (data.allComments[i].mode === "reply") { 
						var comment = {};
						comment["id"] = data.allComments[i].id;
						comment["userName"] = data.allComments[i].userName;
						comment["mode"] = data.allComments[i].mode;
						comment["value"] = valueText;
						comment["created"] = data.allComments[i].created;

						var index = tempDict[data.allComments[i].parent];
						thisClass.commentsTree[index]["replies"].push(comment);
					}
				}
				thisClass.displayComments();
			} 
		});
	},
	
	displayComments:function() {
          var thisClass = this;
          for (var i =0; i < thisClass.commentsTree.length; ++i ){
            var comment = thisClass.commentsTree[i];
            var e = thisClass.createACommentEntry(comment);
            thisClass.divComments.appendChild(e);
          } 
        },
	
	createACommentEntry:function(comment) {
		var thisClass = this;
		var rootID = this.divPublishComment.id+"_entry"+comment["id"];
		
		var divEntry;
		divEntry = document.createElement('div');
		divEntry.id = rootID;
		divEntry.className = "comments_entry";
		
		var divSil;
		divSil = document.createElement('img');
		divSil.className = "comments_entry_silhouette";
		divSil.id = rootID+"_silhouette";
		divSil.src = paella.initDelegate.initParams.accessControl.userData.avatar;
		divEntry.appendChild(divSil);
		
		var divCommentContainer;
		divCommentContainer = document.createElement('div');
		divCommentContainer.className = "comments_entry_container";
		divCommentContainer.id = rootID+"_comment_container";
		divEntry.appendChild(divCommentContainer);
		
		var divCommentMetadata;
		divCommentMetadata = document.createElement('div');
		divCommentMetadata.id = rootID+"_comment_metadata"; 
		divCommentContainer.appendChild(divCommentMetadata);
		
		var datePublish = comment["created"];
		
		var headLine = "<span class='comments_entry_username'>" + comment["userName"] + "</span>";
		headLine += "<span class='comments_entry_datepublish'>" + datePublish + "</span>";
		
		divCommentMetadata.innerHTML = headLine;
		
		var divCommentValue;
		divCommentValue = document.createElement('div');
		divCommentValue.id = rootID+"_comment_value";
		divCommentValue.className = "comments_entry_comment";
		divCommentContainer.appendChild(divCommentValue);		
		
		divCommentValue.innerHTML = comment["value"];
		
		var divCommentReply = document.createElement('div');
		divCommentReply.id = rootID+"_comment_reply";
		divCommentContainer.appendChild(divCommentReply);
		
		if (this.canPublishAComment == true) {
			var btnRplyComment = document.createElement('button');
			btnRplyComment.id = rootID+"_comment_reply_button";
			btnRplyComment.onclick = function(){
				var e = thisClass.createAReplyEntry(comment["id"]);
				this.style.display="none";
				this.parentElement.parentElement.appendChild(e);
			};
			btnRplyComment.innerHTML = paella.dictionary.translate("Reply");
			divCommentReply.appendChild(btnRplyComment);
		}
		
		for (var i =0; i < comment.replies.length; ++i ){
			var e = thisClass.createACommentReplyEntry(comment["id"], comment["replies"][i]);
			divCommentContainer.appendChild(e);
		}
		return divEntry;
	},
	
	createACommentReplyEntry:function(parentID, comment) {
		var thisClass = this;
		var rootID = this.divPublishComment.id+"_entry_" + parentID + "_reply_" + comment["id"];

		var divEntry;
		divEntry = document.createElement('div');
		divEntry.id = rootID;
		divEntry.className = "comments_entry";
		
		var divSil;
		divSil = document.createElement('img');
		divSil.className = "comments_entry_silhouette";
		divSil.id = rootID+"_silhouette";
		divSil.src = paella.initDelegate.initParams.accessControl.userData.avatar;
		divEntry.appendChild(divSil);
			
		var divCommentContainer;
		divCommentContainer = document.createElement('div');
		divCommentContainer.className = "comments_entry_container";
		divCommentContainer.id = rootID+"_comment_container";
		divEntry.appendChild(divCommentContainer);
			
		var divCommentMetadata;
		divCommentMetadata = document.createElement('div');
		divCommentMetadata.id = rootID+"_comment_metadata"; 
		divCommentContainer.appendChild(divCommentMetadata);
		var datePublish = comment["created"];
		
		var headLine = "<span class='comments_entry_username'>" + comment["userName"] + "</span>";
		headLine += "<span class='comments_entry_datepublish'>" + datePublish + "</span>";
 
		divCommentMetadata.innerHTML = headLine;
		
		var divCommentValue;
		divCommentValue = document.createElement('div');
		divCommentValue.id = rootID+"_comment_value";
		divCommentValue.className = "comments_entry_comment";
		divCommentContainer.appendChild(divCommentValue);		
		
		divCommentValue.innerHTML = comment["value"];
			
		return divEntry;
	},
	
	createAReplyEntry:function(annotationID) {
		var thisClass = this;
		var rootID = this.divPublishComment.id+"_entry_" + annotationID + "_reply";

		var divEntry;
		divEntry = document.createElement('div');
		divEntry.id = rootID+"_entry";
		divEntry.className = "comments_entry";
		
		var divSil;
		divSil = document.createElement('img');
		divSil.className = "comments_entry_silhouette";
		divSil.id = rootID+"_silhouette";
		divSil.src = paella.initDelegate.initParams.accessControl.userData.avatar;
		divEntry.appendChild(divSil);
		
		var divCommentContainer;
		divCommentContainer = document.createElement('div');
		divCommentContainer.className = "comments_entry_container comments_reply_container";
		divCommentContainer.id = rootID+"_reply_container";
		divEntry.appendChild(divCommentContainer);
	
		var textArea;
		textArea = document.createElement('textArea');
		textArea.onclick = function(){paella.keyManager.enabled = false;};
		textArea.draggable = false;
		textArea.id = rootID+"_textarea";
		divCommentContainer.appendChild(textArea);
		
		this.publishCommentButtons = document.createElement('div');
		this.publishCommentButtons.id = rootID+"_buttons_area";
		divCommentContainer.appendChild(this.publishCommentButtons);
		
		var btnAddComment;
		btnAddComment = document.createElement('button');
		btnAddComment.id = rootID+"_btnAddComment";
		btnAddComment.className = "publish";
		btnAddComment.onclick = function(){
			var txtValue = textArea.value;
			if (txtValue.replace(/\s/g,'') != "") {
				thisClass.addReply(annotationID,textArea.id);
			}
		};
		btnAddComment.innerHTML = paella.dictionary.translate("Reply");
		
		this.publishCommentButtons.appendChild(btnAddComment);
		
		return divEntry;
	}
	

});
  

paella.plugins.commentsPlugin = new paella.plugins.CommentsPlugin();
