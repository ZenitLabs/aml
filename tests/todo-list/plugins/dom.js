define('plugins/dom',
[], function () {
	return {
		dynamic : true,
		load : function (selector, req) {
			if (selector[0] == '.') {
				return document.getElementsByClassName(selector.substr(1));
			}  else if (selector[0] == '#') {
				return document.getElementById(selector.substr(1));
			} else if (selector.match(/^attr:/g) != null) {
				return document.querySelectorAll("[" + selector.split(':')[1] + "]");
			} else {
				return document.getElementsByTagName(selector)
			}
		}
	}
})