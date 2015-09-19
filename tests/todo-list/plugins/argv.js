define([], function () {
	return {
		dynamic : true,
		load : function (resource, req, onload) {
			var argv = [];
			var tmp = resource.split(';');
			tmp.map(function (arg) {
				var data = arg.split(':');
				switch(data[1]) {
					case 'int':
						argv.push(parseInt(data[0]));
						break;
					case 'float':
						argv.push(parseFloat(data[0]));
						break;
					case 'string':
						argv.push(data[0].toString());
						break;
					case 'boolean':
						argv.push(data[0].toString() === 'true');
						break;
				}
			})
			return argv;
		}
	}
})