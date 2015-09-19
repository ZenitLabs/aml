define([
	'components/base'
], function (Base) {
	function Input (nodedata) {
		var $self = this;
		$self.el = nodedata.node || null;

		var bind = null;
		var inputType = nodedata.type.toLowerCase();
		if (inputType == 'checkbox') {
			bind = {
				click : function (evt) {
					$self.updateScope(nodedata, 'checked');
				}
			}
		} else if (inputType == 'radio') {
			bind = {
				click : function (evt) {
					$self.updateScope(nodedata, 'value');
				}
			}
		} else {
			bind = {
				keyup : function (evt) {
					$self.updateScope(nodedata, 'value');
				}
			}
		}

		$self.on(bind);
	}

	Base.prototype.asPrototypeOf(Input);

	Input.prototype.updateScope = function (nodedata, htmlElementProp) {
		for (var i in nodedata.bindings) {
			var binddata = nodedata.bindings[i];
			for (var j in binddata.properties) {
				this.template.updateSource(binddata.properties[j].name, this.el[htmlElementProp], this);
			}
		}
	}

	return Input;
})