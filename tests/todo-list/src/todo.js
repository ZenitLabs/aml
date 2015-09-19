define(function () {
	var uid = 0;
	function Todo(name, done, urgent, customTags) {
		this.uid = ++uid;
		this.name = name;
		this.done = done;
		this.urgent = urgent;
		this.customTags = customTags || [];
	}

	Todo.prototype = {
		isDone : function () {
			return this.done;
		},
		isUrgent : function () {
			return !this.done && this.urgent;
		},
		setTags : function (tags) {
			this.customTags = tags || [];
		},
		printTags : function () {
			return this.customTags.length > 0 ? "#" + this.customTags.join(" #") : "";
		},
		toString : function () {
			return this.name;
		}
	}

	return Todo;
})