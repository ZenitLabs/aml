define({
	'g-show-if' : function () {
		var defaultVal;
		var parse = function (val, node) { 
			defaultVal = node.style.display;
			return val; 
		}
		var exec = function (component, source, funcName) {
			if (source[funcName] == null || Object.prototype.toString.call(source[funcName]) != '[object Function]') {
				console.error('"' + funcName + '" in ', source, " is not a function.");
				throw new Error();
			}
			var result = source[funcName]();
			if (result) {
				component.node.style.display = defaultVal;
			} else {
				component.node.style.display = "none";
			}
		}

		return {
			parse : parse,
			exec : exec
		}
	}()
});