(function(global, $http){
	if (define != null && Object.prototype.toString.call(define.amd) === '[object Object]') {
		define($http)
	} else if (typeof exports === 'object' && typeof module === 'object') {
		module.exports = $http();
	} else if (typeof exports === 'object') {
		exports['$http'] =  $http();
	} else {
		global['$http'] = $http();
	}
})(this, (function(){
	return function () {
		var isIE = function () { 
		    var undef, rv = -1; // Return value assumes failure.
	        var ua = window.navigator.userAgent;
	        var msie = ua.indexOf('MSIE ');
	        var trident = ua.indexOf('Trident/');

	        if (msie > 0) {
	            // IE 10 or older => return version number
	            rv = parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
	        } else if (trident > 0) {
	            // IE 11 (or newer) => return version number
	            var rvNum = ua.indexOf('rv:');
	            rv = parseInt(ua.substring(rvNum + 3, ua.indexOf('.', rvNum)), 10);
	        }

	        return ((rv > -1) ? rv : undef);
	    }();

		function Http(args){
			var headers = {};
			var defArgs = {
				/* Http method */
				type 		: 'GET',
				/* Asynchronous request */
				async 		: true,
				/* Process data based on 'Content-Type' header */
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

			var http = null;
			if (window.XMLHttpRequest) {
		         http = new XMLHttpRequest();
		    }
		    else {
		         try {
		         	http = new ActiveXObject("Msxml2.XMLHTTP");
		         } catch (e) {
		         	http = new ActiveXObject("Microsoft.XMLHTTP");
		         }
		    }
			http.setRequestHeader = function(header, value) {
				headers[header] = value;
				/* Content-Type multipart/form-data and boundary are defined by the browser. */
				if (header.toLowerCase() == "content-type" && value.toLowerCase().indexOf("multipart/form-data") > -1)
					return;
				if (XMLHttpRequest.prototype.setRequestHeader)
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
					var response = http.response || http.responseText;
					switch (args.parseAs) {
						case 'xml':
							var p = new DOMParser();
							response = p.parseFromString(response, 'text/xml');
							break;
						case 'html':
							var p = new DOMParser();
							response = p.parseFromString(response,  (isIE ? 'application/xhtml+xml' : 'text/html'));
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

			if (isIE) {
			 	http.onreadystatechange = function(evt) { //Call a function when the state changes.
			       	if (http.readyState == 4 && http.status == 200) {
			       		onload.call(null, http);
			       	} else if (http.readyState == 4 && http.status != 200) {
			       		onerror.call(null, http);
			       	} else {
			       		onprogress.call(null, evt);
			       	}
			   }
			} else {
				http.addEventListener("progress", 	onprogress,	false);
				http.addEventListener("load", 		onload, 	false);
				http.addEventListener("error", 		onerror, 	false);
				http.addEventListener("abort", 		onabort, 	false);
			}
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

		var _http = function (args) {
			new Http(args);
		};

		return _http;
	}
})());