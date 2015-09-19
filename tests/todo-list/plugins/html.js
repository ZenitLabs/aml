define([
	'lib/http'
], function ($http) {
	return {
		load : function (resource, req, onload) {
			if (resource.indexOf('http://') != 0 && resource.indexOf('https://') != 0 && resource.indexOf('/')!= 0)
				resource = req.toUrl(resource)

			$http({
				url : resource,
				parseAs : 'html',
				success : function (dom) {
					onload.call(null, dom);
				}
			});
		}
	}
})