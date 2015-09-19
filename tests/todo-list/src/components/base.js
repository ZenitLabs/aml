define([
	'../core/events'
],
function ($events) {
	function Base(nodedata) {
		var $self = this;
		$self.template = null;
		$self.el = nodedata.node;

		if (nodedata.contenteditable != null) {
			$self.on({
				keyup : function (evt) {
					$self.updateScope(nodedata);
				}
			});
		}
	}

	Base.prototype = {
		on : function (events) {
			for (var i  in events) {
				var name = this.attribute2camelCase(i);
				if (this.el.addEventListener) {
					this.el.addEventListener(name, events[i], true);
				} else if (this.el.attachEvent) {
					this.el.attachEvent(name, events[i]);
				}
			}
		},
		asPrototypeOf : function (component) {
			component.prototype = Object.create(Base.prototype);
			component.prototype.constructor = component;
		},
		camelCase2attribute: function(camelCase){
			if(!camelCase)
				return null;
			return camelCase.replace(/([A-Z]+)/g, " $1").toLowerCase().replace(/[\s]/, "-")
		},
		attribute2camelCase: function(attr){
			if(!attr)
				return null;
			var camelCase = attr[0];
			for (var i = 1; i < attr.length; i++) {
				if (attr[i] == '-')
					continue;

				if (attr[i-1] == "-") {
					camelCase += attr[i].toUpperCase();
				} else {
					camelCase += attr[i];
				}
			}
			return camelCase;
		},
		updateScope : function (nodedata) {
			for (var i in nodedata.bindings) {
				var data = nodedata.bindings[i];
				for (var j in data.properties) {
					this.template.updateSource(data.properties[j].name, this.el.innerHTML, this);
				}
			}
		}
	}

	return Base;
})