define([
	'./ajax'
], function(ajax){
	return {
		dynamic : true,
		load : function(resource, require, onload, config) {
			var url = require.toUrl(resource);
			ajax.load(url, require, 
				function (data) {
					onload(data);
				}
			);
		}
	}
});