define('core/template-loader', 
[
	'plugins/html',
	'./template-builder'
], function (html, TemplateBuilder) {
	return {
		dynamic : true,
		load : function (resource, req, onload) {
			html.load(resource, req, function (dom) {
				var body = dom.getElementsByTagName('body')[0];
				var source = null;
				if (body == null)
					source = dom.querySelectorAll('*')
				else
					source = body.children;
				
				TemplateBuilder.parse(source, function (template) {
					onload.call(null, template);
				});

			})
		}
	}
})