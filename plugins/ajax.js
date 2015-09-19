define(function(){
	function Http(args){
		var headers = {};
		var defArgs = {
			/* Http method */
			type 		: 'GET',
			/* Asynchronous request */
			async 		: true,
			/* Process data base on 'Content-Type' header */
			processData : true,
			/* Request body or query string */
			data 		: null,
			/* Http Headers */
			headers		: {
				'Content-Type' : 'application/x-www-form-urlencoded'
			},
			/* text | html,xml | json */
			parseAs		: 'text',
			/* Callbacks: if before returns false, the request will be canceled */
			before		: null,
			/* Callbacks: Whene request is successful */
			success		: null,
			/* Callbacks: Whene request is in progress */
			progress 	: null,
			/* Callbacks: Whene request fail */
			error 		: null,
			/* Callbacks: Whene request is aborted */
			abort 		: null,
		}

		for (var i in defArgs){
			if(args[i] == null)
				args[i] = defArgs[i];
		}

		var http = new XMLHttpRequest();
		http.setRequestHeader = function(header, value) {
			headers[header] = value;
			/* Content-Type multipart/form-data and boundary are defined by the browser. */
			if (header.toLowerCase() == "content-type" && value.toLowerCase().indexOf("multipart/form-data") > -1)
				return;
			XMLHttpRequest.prototype.setRequestHeader.apply(http, arguments);
		}

		http.getRequestHeader = function(header) {
			return headers[header];
		}
		
		// progress on transfers from the server to the client (downloads)
		function onprogress (evt) {
		  if (args.progress)
		  	args.progress(evt.loaded / evt.total, evt);
		}

		function onload(evt) {
			if (args.success){
				var response = http.response;
				switch (args.parseAs) {
					case 'xml':
						var p = new DOMParser();
						response = p.parseFromString(response, 'text/xml');
						break;
					case 'html':
						var p = new DOMParser();
						response = p.parseFromString(response, 'text/html');
						break;
					case 'json':
						response = JSON.parse(response);
						break;
				}
		  		args.success(response, http);
			}
		}

		function onerror(evt) {
			if (args.error)
		  		args.error(evt);
		}

		function onabort(evt) {
	  		if (args.abort)
		  		args.abort(evt);
		}

		http.addEventListener("progress", 	onprogress,	false);
		http.addEventListener("load", 		onload, 	false);
		http.addEventListener("error", 		onerror, 	false);
		http.addEventListener("abort", 		onabort, 	false);

		var doRequest = true;
		if (args.before != null && !args.before())
			return;

		http.open(args.type, args.url, args.async);
		for(var i in args.headers){
			http.setRequestHeader(i, args.headers[i]);
		}

		if (args.overrideMimeType)
			http.overrideMimeType = args.overrideMimeType;
		
		
		var data = args.data;
		if (args.processData) {
			var ct = http.getRequestHeader('Content-Type');
			data = ParamSerializer(data, ct);
		}
		http.send(data);
	}

	function ParamSerializer(params, contentType){
		var ct = contentType.toLowerCase();
		if (ct.indexOf("multipart/form-data") > -1) {
			return multipart(params);
		} else if (ct.indexOf("application/json") > -1) {
			return JSON.stringify(params);
		} else {
			return uriencode(params);
		}

		function uriencode(obj, prefix) {
		      var str = [];
			  for(var p in obj) {
			    if (obj.hasOwnProperty(p)) {
			      var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
			      str.push(typeof v == "object" ?
			        uriencode(v, k) :
			        encodeURIComponent(k) + "=" + encodeURIComponent(v));
			    }
			  }
			  return str.join("&");
		}

		function multipart(parts){
			var fd = new FormData();
			for(var key in parts){
				fd.append(key, parts[key]);
			}
			return fd;
		}
	}

	return {
		dynamic : true,
		load : function(resource, req, onload, config) {
			if (resource.indexOf('http://') != 0 && resource.indexOf('https://') != 0 && resource.indexOf('/')!= 0)
				resource = req.toUrl(resource)
			new Http({
				url : resource,
				success : onload
			});
		}
	}
});