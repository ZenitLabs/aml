define([], function () {
	return {		
		load : function (resource, req, onload) {
			resource = this.normalize(resource, req);
			var head = document.getElementsByTagName('head')[0];
			var link = document.createElement('link');
			link.type = "text/css";
			link.href = resource;
			link.rel = "stylesheet";
			head.appendChild(link);
			return link;
		},
		normalize : function (resource, req) {
			if (resource.indexOf('http://') != 0 && resource.indexOf('https://') != 0 && resource.indexOf('/')!= 0)
				resource = req.toUrl(resource);
			return resource;
		}
	}
})