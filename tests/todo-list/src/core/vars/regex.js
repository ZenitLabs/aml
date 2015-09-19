define({
	bind 		: /\{\{.*?\}\}|\{=.*?=\}/g,
	clean_bind 	: /\{\{|\}\}|\{=|=\}/g,
	bind_html 	: /\{=.*?=\}/g,
	clean_func 	: /\(\)$/,
	bind_property : function (bind) {
		return new RegExp("\\{\\{\\s*" + bind + "\\s*\\}\\}|\\{=\\s*" + bind + "\\s*=\\}", 'g');
	}
})