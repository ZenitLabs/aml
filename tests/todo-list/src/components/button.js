define([
	'components/base'
], function (Base) {
	function Button (nodedata) {
		this.el = nodedata.node;
	}

	Base.prototype.asPrototypeOf(Button);

	return Button;
})