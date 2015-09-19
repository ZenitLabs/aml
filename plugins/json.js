define([
	'./ajax'
], function(ajax){
	return {
		dynamic : true,
		load : function(resource, require, onload, config) {
			var url = require.toUrl(resource);
			ajax.load(url, require, 
				function (data) {
					try {
						var jsData = JSON.parse(data);
					} catch (e) {
						throw new Error("Resource {"+resource+"} has an invalid JSON string in file " + url);
					}
					onload(jsData);
				}
			);
		}
	}
});