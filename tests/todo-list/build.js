(function (global){
	/* Leo Brugnara */
	require.config({
		'baseUrl' : 'src/',
		'paths' : {
			'plugins' : '../plugins'
		},
		'map' : {

		},
		'shim' : {

		},
		'packages' : {

		}
	});
	/* Module core/g-attrs */
	define('core/g-attrs', {
		'g-show-if' : {
			'parse' : function (val, node) { 
				defaultVal = node.style.display;
				return val; 
			},
			'exec' : function (component, source, funcName) {
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
		}
	});
	
	/* Module todo */
	define('todo', function () {
		var uid = 0;
		function Todo(name, done, urgent, customTags) {
			this.uid = ++uid;
			this.name = name;
			this.done = done;
			this.urgent = urgent;
			this.customTags = customTags || [];
		}
	
		Todo.prototype = {
			isDone : function () {
				return this.done;
			},
			isUrgent : function () {
				return !this.done && this.urgent;
			},
			setTags : function (tags) {
				this.customTags = tags || [];
			},
			printTags : function () {
				return this.customTags.length > 0 ? "#" + this.customTags.join(" #") : "";
			},
			toString : function () {
				return this.name;
			}
		}
	
		return Todo;
	});
	
	/* Module plugins/dom */
	define('plugins/dom', [], function () {
		return {
			//dynamic : true,
			load : function (selector, req) {
				if (selector[0] == '.') {
					return document.getElementsByClassName(selector.substr(1));
				}  else if (selector[0] == '#') {
					return document.getElementById(selector.substr(1));
				} else if (selector.match(/^attr:/g) != null) {
					return document.querySelectorAll("[" + selector.split(':')[1] + "]");
				} else {
					return document.getElementsByTagName(selector)
				}
			}
		}
	});
	
	/* Module core/build-html-element */
	define('core/build-html-element', function () {
		var getWrapper = function (tag) {
			var wrapMap = {
			    option: 	[ 1, "<select multiple='multiple'>", "</select>" ],
			    legend: 	[ 1, "<fieldset>", "</fieldset>" ],
			    area: 		[ 1, "<map>", "</map>" ],
			    param: 		[ 1, "<object>", "</object>" ],
			    thead: 		[ 1, "<table>", "</table>" ],
			    tr: 		[ 2, "<table><tbody>", "</tbody></table>" ],
			    col: 		[ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
			    td: 		[ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
			    body: 		[ 0, "", ""],
			    _default: 	[ 1, "<div>", "</div>"  ]
			};
			wrapMap.optgroup = wrapMap.option;
			wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
			wrapMap.th = wrapMap.td;
			var map = wrapMap[tag] || wrapMap._default, element;
	        return map;
		}
		/**
		 * @desc Convierte un string HTML a un HTML Element
		 * @author Krasimir Tsonev
		 * @link http://krasimirtsonev.com/blog/article/Revealing-the-magic-how-to-properly-convert-HTML-string-to-a-DOM-element
		 * @link https://github.com/jquery/jquery/blob/master/src/manipulation.js
		 */
		var createHtmlElement = function(html) {
			var manyNodes = false;
			var nodeLevels = 0;
			if (html.split(/<\/|\/>/).length > 2) {
				manyNodes = true;
				var match = /<\s*\w.*?>/g.exec(html);
				var tag = match[0].replace(/</g, '').replace(/>/g, '').split(' ')[0];
				var map = getWrapper(tag);
				html = map[1] + html + map[2];
				nodeLevels = map[0]-1;
			}
	
			var match = /<\s*\w.*?>/g.exec(html);
			var element = document.createElement('div');
			if(match != null) {
			    var tag = match[0].replace(/</g, '').replace(/>/g, '').split(' ')[0];
			    if(tag.toLowerCase() === 'body') {
			        var dom = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
			        var body = document.createElement("body");
			        // keeping the attributes
			        element.innerHTML = html.replace(/<body/g, '<div').replace(/<\/body>/g, '</div>');
			        var attrs = element.firstChild.attributes;
			        body.innerHTML = html;
			        for(var i=0; i<attrs.length; i++) {
			            body.setAttribute(attrs[i].name, attrs[i].value);
			        }
			        return body;
			    } else {
			        var map = getWrapper(tag), element;
			        html = map[1] + html + map[2];
			        element.innerHTML = html;
			        // Descend through wrappers to the right content
			        var levels = map[0]+1;
			        while(levels--) {
			            element = element.lastChild;
			        }
			    }
			} else {
			    element.innerHTML = html;
			    element = element.lastChild;
			}
			if (manyNodes) {
				while(nodeLevels--) {
					element = element.firstChild;
				}
				var elements = element.childNodes;
				return elements;
			}
			return element;
		}
	
		return createHtmlElement;
	});
	
	/* Module plugins/argv */
	define('plugins/argv', [], function () {
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
	});
	
	/* Module lib/http */
	define('lib/http', function () {
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
		});
	
	/* Module core/events */
	define('core/events', [], function () {
		var $listeners = [];
		var $current = null; /* To prevent infinite loops */
		return {
			listen: function(eventName,callback, args){
				if( !$listeners[eventName] )
					$listeners[eventName] = [];
	
				var subscriber = {
					handler: callback,
					args : args || []
				};
	
				$listeners[eventName].push(subscriber);
			},
			broadcast: function(eventName, params){
				if (!$listeners[eventName] || $current == eventName)
					return;				
				$current = eventName;
				$listeners[eventName].forEach(function(listener){
					var handler = listener['handler'];
					var funcargs = params.concat(listener['args']);
					handler.apply(null, funcargs);
				});
				//$current = null;
			},
			remove : function (eventName) {
				if ($listeners[eventName] != null)
					delete $listeners[eventName];
			},
			listenFor: function(eventName, object, callback, args){
				if( !$listeners[eventName] )
					$listeners[eventName] = [];
	
				var subscriber = {
					handler: callback,
					object: object,
					args : args || []
				};
	
				$listeners[eventName].push(subscriber);
			},
			broadcastBy: function(eventName, params, target){
				if (!$listeners[eventName] || $current == eventName)
					return;
				$current = eventName;
				$listeners[eventName].forEach(function(listener){
					var object = listener['object'];
					if( object == target ){
						var handler = listener['handler'];
						var args = listener['args'];
						var funcargs = params.concat(args);
						handler.apply(object, funcargs);
					}
				});
				$current = null;
			}
		}
	});
	
	/* Module core/vars/html-tags */
	define('core/vars/html-tags', function () {
		return [
			"html", "head", "body", "div", "span", "doctype", 
			"title", "link", "meta", "style", "p", "h1", "h2", 
			"h3", "h4", "h5", "and h6", "strong", "em", "abbr", 
			"acronym", "address", "bdo", "blockquote", "cite", 
			"q", "code", "ins", "del", "dfn", "kbd", "pre", 
			"samp", "var", "br", "a", "base", "img", "area", 
			"map", "object", "param", "ul", "ol", "li", "dl", 
			"dt", "dd", "table", "tr", "td", "th", "tbody", 
			"thead", "tfoot", "col", "colgroup", "caption", 
			"form", "input", "textarea", "select", "option", 
			"optgroup", "button", "label", "fieldset", "legend", 
			"script", "noscript", "b", "i", "tt", "sub", "sup", 
			"big", "small", "hr"
		];
	});
	
	/* Module core/vars/regex */
	define('core/vars/regex', {
		'bind' : /\{\{.*?\}\}|\{=.*?=\}/g,
		'clean_bind' : /\{\{|\}\}|\{=|=\}/g,
		'bind_html' : /\{=.*?=\}/g,
		'clean_func' : /\(\)$/,
		'bind_property' : function (bind) {
			return new RegExp("\\{\\{\\s*" + bind + "\\s*\\}\\}|\\{=\\s*" + bind + "\\s*=\\}", 'g');
		}
	});
	
	/* Module plugins/css */
	define('plugins/css', [], function () {
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
	});
	
	/* Module components/base */
	define('components/base', ['core/events'], function ($events) {
		function Base(nodedata) {
			var $self = this;
			$self.template = null;
			$self.el = nodedata.node;
	
			if (nodedata.contenteditable != null) {
				$self.on({
					keyup : function (evt) {
						$self.updateScope(nodedata);
					}
				});
			}
		}
	
		Base.prototype = {
			on : function (events) {
				for (var i  in events) {
					var name = this.attribute2camelCase(i);
					if (this.el.addEventListener) {
						this.el.addEventListener(name, events[i], true);
					} else if (this.el.attachEvent) {
						this.el.attachEvent(name, events[i]);
					}
				}
			},
			asPrototypeOf : function (component) {
				component.prototype = Object.create(Base.prototype);
				component.prototype.constructor = component;
			},
			camelCase2attribute: function(camelCase){
				if(!camelCase)
					return null;
				return camelCase.replace(/([A-Z]+)/g, " $1").toLowerCase().replace(/[\s]/, "-")
			},
			attribute2camelCase: function(attr){
				if(!attr)
					return null;
				var camelCase = attr[0];
				for (var i = 1; i < attr.length; i++) {
					if (attr[i] == '-')
						continue;
	
					if (attr[i-1] == "-") {
						camelCase += attr[i].toUpperCase();
					} else {
						camelCase += attr[i];
					}
				}
				return camelCase;
			},
			updateScope : function (nodedata) {
				for (var i in nodedata.bindings) {
					var data = nodedata.bindings[i];
					for (var j in data.properties) {
						this.template.updateSource(data.properties[j].name, this.el.innerHTML, this);
					}
				}
			}
		}
	
		return Base;
	});
	
	/* Module components/button */
	define('components/button', ['components/base'], function (Base) {
		function Button (nodedata) {
			this.el = nodedata.node;
		}
	
		Base.prototype.asPrototypeOf(Button);
	
		return Button;
	});
	
	/* Module plugins/html */
	define('plugins/html', ['lib/http'], function ($http) {
		return {
			//dynamic : false,
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
	});
	
	/* Module components/input */
	define('components/input', ['components/base'], function (Base) {
		function Input (nodedata) {
			var $self = this;
			$self.el = nodedata.node || null;
	
			var bind = null;
			var inputType = nodedata.type.toLowerCase();
			if (inputType == 'checkbox') {
				bind = {
					click : function (evt) {
						$self.updateScope(nodedata, 'checked');
					}
				}
			} else if (inputType == 'radio') {
				bind = {
					click : function (evt) {
						$self.updateScope(nodedata, 'value');
					}
				}
			} else {
				bind = {
					keyup : function (evt) {
						$self.updateScope(nodedata, 'value');
					}
				}
			}
	
			$self.on(bind);
		}
	
		Base.prototype.asPrototypeOf(Input);
	
		Input.prototype.updateScope = function (nodedata, htmlElementProp) {
			for (var i in nodedata.bindings) {
				var binddata = nodedata.bindings[i];
				for (var j in binddata.properties) {
					this.template.updateSource(binddata.properties[j].name, this.el[htmlElementProp], this);
				}
			}
		}
	
		return Input;
	});
	
	/* Module core/template */
	define('core/template', ['core/events','core/g-attrs','core/vars/html-tags','core/vars/regex'], function ($events, GAttrs, HTMLTags, Regex) {
		var TEMPLATE_ID = 1;
	
		function Template (tree, nodes) {
			var $this = this;
			$this.id = TEMPLATE_ID++;
			var tree = tree;
			var nodelist = nodes;
	
			if (nodelist) {
				for (var i in nodelist) {
					if (nodelist[i].component) {
						nodelist[i].component.template = $this;
					}
				}
			}
	
			this.renderIn = function (element) {
				for (var i in tree) {
					var node = tree[i].node;
					element.appendChild(node);
				}
	
				for (var i in nodelist) {
					var nodedata = nodelist[i];
					if (nodedata.node.nodeType == Node.TEXT_NODE)
						continue;
					if (HTMLTags.indexOf(nodedata.tag.toLowerCase()) == -1) {
						var el = document.createElement('ul');	/* TODO: dynamic tagName */
						if (nodedata.node.innerHTML != null)
							el.innerHTML = nodedata.node.innerHTML;
						for (var i = 0, atts = nodedata.node.attributes, n = atts.length; i < n; i++){
						    el.setAttribute(atts[i].nodeName, atts[i].nodeValue);
						}
						nodedata.node.parentNode.appendChild(el);
						nodedata.node.parentNode.removeChild(nodedata.node);
						nodedata.node = el;
						nodedata.tag = 'UL'; /* TODO: dynamic tagName */
						nodedata.component.el = el;
					}
				}
			}
	
			this.component = function (id) {
				if (id.match(/\{.+\}/))
					id = id.replace(/\{.+\}/, "").trim();
				for (var i in nodelist) {
					var byId = nodelist[i].id && nodelist[i].id == id;
					var byTag = nodelist[i].tag === id.toUpperCase();
					var byClass = nodelist[i].className && nodelist[i].className.indexOf(id) > -1;
	
					if ((byId || byTag || byClass) && nodelist[i].component)
						return nodelist[i].component;
				}
				return null;
			}
	
			this.node = function (id) {
				if (id.match(/\{.+\}/))
					id = id.replace(/\{.+\}/, "").trim();
				for (var i in nodelist) {
					var byId = nodelist[i].id && nodelist[i].id == id;
					var byTag = nodelist[i].tag === id.toUpperCase();
					var byClass = nodelist[i].className && nodelist[i].className.indexOf(id) > -1;
	
					if ((byId || byTag || byClass))
						return nodelist[i];
				}
				return null;
			}
	
			/**
			 * If g-watch is present, register watches to run gAttrs.
			 */
			var addWatches = function (source) {
				if (nodelist) {
					for (var i in nodelist) {
						var watchTo = nodelist[i]['g-watch'];
						if (watchTo == null)
							continue;
						var watches = watchTo.split(',');
						for (var j in watches) {
							$this.watch(watches[j], source);
							var listenChange = 't-' + $this.id + '-change-' + watches[j];
							$events.listenFor(listenChange, $this, function (nodedata) {
								runGAttributes(nodedata, source);
							}, [nodelist[i]]);
						}
						runGAttributes(nodelist[i], source);
					}
				}
			}
	
			var runGAttributes = function (node, source) {
				if (node['g-attrs'] == null)
					return;
				var gAttributes = node['g-attrs'];
				for (var gAttrName in gAttributes) {
					var gAttrDef = GAttrs[gAttrName];
					if (gAttrDef.exec)
						gAttrDef.exec.call(null, node, source, gAttributes[gAttrName]);
				}
			}
	
			var $changeSource = null;
	
			this.bind = function ($source, nodes) {
				addWatches($source);
				var bindInNodes = nodes || nodelist;
				for (var i in bindInNodes) {
					var nodedata = bindInNodes[i];
					for (var j in nodedata.bindings) {
						var bindData = nodedata.bindings[j];
						var node = bindData.node;
						var properties = bindData.properties.concat();
	
						for (var i in properties) {
							var bind = properties[i].name;
							var isFunc = false;
							var funcWatch = null;
							if (bind.match(Regex.clean_func)) {
								isFunc = true;
								if ((funcWatch = nodedata['g-watch']) == null)
									continue;
								funcWatch = funcWatch.split(',');
								bind = bind.replace(Regex.clean_func, "");
							}
	
							var replace_regex = Regex.bind_property(bind);
							var $this = this;
	
							if ($this.getNestedProperty($source, bind) == undefined)
								continue;
	
							if (isFunc) {
								for (var k in funcWatch) {
									var bind = funcWatch[i];
									this.watch(bind, $source);
									var listenForEvent = 't-' + $this.id + '-bind-' + bind;
									$events.listenFor(listenForEvent, $source, function (node, source) {
										if ($changeSource != node.component)
											$this.doBind(node, source);
										$changeSource = null;
									}, [nodedata, $source]);
								}
							} else {
								this.watch(bind, $source);
								var listenForEvent = 't-' + $this.id + '-bind-' + bind;
								$events.listenFor(listenForEvent, $source, function (node, source) {
									if ($changeSource != node.component)
										$this.doBind(node, source);
									$changeSource = null;
								}, [nodedata, $source])
	
								var listenEvent = 't-' + $this.id + '-update-' + bind;
								$events.listen(listenEvent, function (value, origin, bind, node, source) {
									$changeSource = origin;
									$this.setValue(source, bind, value);
								}, [bind, nodedata, $source])
							}
							
							this.doBind(nodedata, $source);
						}
					}
				}
			}
	
			var htmlEncode = function(value) {
			  var el = document.createElement('div');
			  if (value) {
			    el.innerText = el.textContent = value;
			    return el.innerHTML;
			  }
			  return value;
			}
	
			function htmlDecode(str) {
			  var d = document.createElement("div");
			  d.innerHTML = str; 
			  return typeof d.innerText !== 'undefined' ? d.innerText : d.textContent;
			}
			
			this.updateSource = function (bind, value, origin) {
				var broadcastEvent = 't-'+$this.id+'-update-' + bind;
				$events.broadcast(broadcastEvent, [value, origin]);
			}
	
	
			this.doBind = function (nodedata, $source) {
				for (var j in nodedata.bindings) {
					var bindData = nodedata.bindings[j];
					var component = nodedata.component;
					var source = bindData.source.concat();
					var properties = bindData.properties.concat();
	
					if (component && component.bind) {
						component.bind(properties, $source);
					} else {
						for (var i in properties) {
							var property = properties[i];
							var bind = property.name;
							var bindText = bind;
							var isFunc = false;
							var isInput = property.node.tagName && property.node.tagName == 'INPUT';
							var inputType = isInput ? nodedata.type.toLowerCase() : null;
	
							if (bind.match(Regex.clean_func)) {
								isFunc = true;
								bind = bind.replace(Regex.clean_func, "");
								bindText = bindText.replace(Regex.clean_func, "\\(\\)");
							}
							var replace_regex = Regex.bind_property(bindText);
	
							var val = $this.getValue($source, bind) || "";
							var bindValue = isFunc && typeof val == 'function' ? val.call($source) : val;
							if (!property.html)
								bindValue = htmlEncode(bindValue);
	
							if (property.isAttr) {
								source = bindValue;
							} else {
								source = source.replace(replace_regex, bindValue);
							}
	
							if (isInput) {
								if (['checkbox', 'radio'].indexOf(inputType) > -1) {
									if (inputType == 'checkbox' && property.node.checked != source) {
										property.node.checked = source;
									} else {
										property.node.checked = property.node.value == source;
									}
								} else {
									property.node.value = source;
								}
							} else {
								if (property.html && property.node.innerHTML != source || bindData.html) {
									property.node.innerHTML = source;
								} else {
									if (property.node.nodeType == Node.ELEMENT_NODE && property.node.textContent != source) {
										property.node.textContent = source;
									} else if (property.node.nodeValue != source) {
										property.node.nodeValue = source;
									}
								}
							}
						}
					}
				}
			}
		}
	
		var $notifiers = {};
		
		var addNotifier = function (template, sourceObj, property, id)  {
			var broadcastChange = 't-' + id + '-change-' + property;
			var broadcastBind = 't-' + id + '-bind-' + property;
	
			if ($notifiers[property] == null)
				$notifiers[property] = [];
	
			$notifiers[property].push({
				template : template,
				source : sourceObj,
				events : [
					{
						name : broadcastBind,
						args : [],
						by : sourceObj
					},
					{
						name : broadcastChange,
						args : [],
						by : template
					}
				]
			})
		}
	
		var triggerNotifier = function (target, sourceObj, property, func) {
			var isArray = Object.prototype.toString.call(target) == "[object Array]";
	
			var prevState = isArray ? Array.prototype.slice.call(target) : Template.prototype.getValue.call(null, target, property);
			var res = func.call(target);
			if (res != undefined)
				target = res;
			var actualState = isArray ? Array.prototype.slice.call(target) : Template.prototype.getValue.call(null, target, property);
	
			var eq = false;
			if (isArray) {
				eq = prevState.length == actualState.length;
				if (eq && prevState.length == actualState.length) {
					for (var i in prevState) {
						if (prevState[i] != actualState[i]) {
							eq = false;
							break;
						}
					}
				}
			}
	
			if (eq) {
				return target;
			}
			var propertyNotifiers = $notifiers[property];
			for (var i=0; i < propertyNotifiers.length; i++) {
				var notifier = propertyNotifiers[i];
				if (notifier.source != sourceObj)
					continue;
				var events = notifier.events;
				for (var j=0; j < events.length; j++) {
					var ev = events[j];
					$events.broadcastBy(ev.name, ev.args, ev.by);
				}
			}
		}
	
		Template.prototype = {
			watch : function(prop, source){
				var nesteds = prop.split("."); 	// Path
				var property = nesteds.pop();	// Final var
				var $source = source;
				var $target = source;
				var $this = this;
	
				if (nesteds.length > 0) {
					$target = this.getNestedProperty($source, prop);	// If prop is a nested property, search his parent object
				} else {
					property = prop;
				}
	
				var type = Object.prototype.toString.call($target[property]);
				if (type == "[object Array]") {
					[
						"push", 	"pop", 			"slice", 
						"reduce", 	"reduceRight", 	"reverse",
						"shift",	"unshift", 		"splice",
						"concat", 	"sort"
					].forEach(function(method){
						eval([
							"Object.defineProperty($target[property], '"+method+"', {",
								"value : function () {",
									"var args = Array.prototype.slice.call(arguments);",
									"triggerNotifier(this, $source, prop, function () {",
										"Array.prototype."+method+".apply(this, args);",
									"});",
								"},",
								"enumerable: true,",
								"configurable: true",
							"});"
						].join('\n'));
					})
					
					Object.defineProperty($target[property], 'get', {
						value : function (index) {
							return this[index] != null ? this[index] : undefined;
						},
						enumerable: true,
						configurable: true
					});
	
					Object.defineProperty($target[property], 'set', {
						value : function (index, el) {
							triggerNotifier(this, $source, prop, function () {
								this[index] = el;
							});
						},
						enumerable: true,
						configurable: true
					});
	
					Object.defineProperty($target[property], 'remove', {
						value : function (index) {
							triggerNotifier(this, $source, prop, function () {
								delete this[index];
								return this.filter(function (el) {
									return el != null;
								})
							});
						},
						enumerable: true,
						configurable: true
					});
				}
	
				var val = $target[property];		// Final value to get/retrieve
				addNotifier($this, $source, prop, $this.id);
				Object.defineProperty($target, property, {
					get: function(){
						return val;
					},
					set: function(newVal){
						triggerNotifier(this, $source, prop, function () {
							var oldVal = val;
							val = newVal;
						});
					},
					enumerable: true,
					configurable: true
				});
				if( $source != $target )
					this.setNestedProperty($source, prop, $target);
			},
			getNestedProperty:function(source, s) {
				var o = source;
			    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
			    s = s.replace(/^\./, '');           // strip a leading dot
			    var a = s.split('.');
			    while (a.length) {
			        var n = a.shift();
			        if (n in o) {
			        	if( a.length == 0 ){
			        		return o;
			        	}
			            o = o[n];
			        } else {
			            return null;
			        }
			    }
			    return o;
			},
			setNestedProperty:function(target, s, v) {
			        var schema = target;  // a moving reference to internal objects within obj
				    var pList = s.split('.');
				    pList.pop();
				    var len = pList.length;
				    for(var i = 0; i < len-1; i++) {
				        var elem = pList[i];
				        if( !schema[elem] ) schema[elem] = {}
				        schema = schema[elem];
				    }
				    schema[pList[len-1]] = v;
			},
			getValue:function(source, s) {
				var o = source;
			    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
			    s = s.replace(/^\./, '');           // strip a leading dot
			    var a = s.split('.');
			    while (a.length) {
			        var n = a.shift();		        
			        if (n in o) {
			            o = o[n];		            
			        } else {
			            return null;
			        }
			    }
			    return (o && typeof o == "function" ? o.call(source) : o);
			},
			setValue:function(target, s, v) {
		        var schema = target;  // a moving reference to internal objects within obj
			    var pList = s.split('.');
			    var len = pList.length;
			    for(var i = 0; i < len-1; i++) {
			        var elem = pList[i];
			        if( !schema[elem] ) schema[elem] = {}
			        schema = schema[elem];
			    }
			    schema[pList[len-1]] = v;
			}
		}
	
		return Template;
	});
	
	/* Module core/template-builder */
	define('core/template-builder', ['require','core/events','core/template','core/g-attrs','core/vars/html-tags','core/vars/regex'], function (req, $events, Template, GAttrs, HTMLTags, Regex) {	
	
		var parse = function (nodelist, callback) {
			nodelist = Array.prototype.slice.call(nodelist);
			var div = document.createElement('div');
			nodelist.map(function (el) {
				div.appendChild(el);
			})
			nodelist = div.childNodes;
			div = null;
			
			var tree = getTree(Array.prototype.slice.call(nodelist));
			var nodes = getArrayOfNodes(tree);
			initComponents(nodes, function () {
				callback.call(null, new Template(tree, nodes));
			});
		}
	
		var initComponents = function (nodes, callback) {
			var count = 0;
			var index = 0;
			var name = (new Date).getTime();
	
			$events.listen('components-ready-' + name, function (c) {
				c.call();
			})
			
			count = nodes.length;
			for (var i in nodes) {
				var node = nodes[i];
				if (node.node.nodeType == Node.TEXT_NODE) {
					count--;
					continue;
				}
	
				var dependency = "components/" + (node['g-type'] != null ? node['g-type'] : 'base');
				
				if (HTMLTags.indexOf(node.tag.toLowerCase()) == -1) {
					dependency = "components/" + node.tag.toLowerCase();
				}
	
				req([
					dependency,
					'plugins/argv!' + name + ':string;' + i + ':int'
				], function (ComponentType, argv) {
					var name = argv[0];
					var pos = argv[1];
					nodes[pos]['component'] = new ComponentType(nodes[pos]);
					count--;
					if (count == 0) {
						$events.broadcast('components-ready-' + name, [callback]);
						$events.remove('components-ready-' + name);
					}
				});
			}
		}
	
		function getArrayOfNodes(tree) {
		    var nodes = [];
		    for (var i = 0; i < tree.length; ++i) {
		        var node = tree[i];
		        nodes.push(node);
		        if (node.children && node.children.length) {
		        	var childs = getArrayOfNodes(node.children);
		            nodes = nodes.concat(childs);
		        }
		    }
		    return nodes;
		}
	
		function getTree(nodeList) {
		    var nodesData = [];
		    for (var i = 0; i < nodeList.length; ++i) {
		        var node = nodeList[i];
		        var nodeData = {
		        	tag : node.nodeName
	        	};
	
		        for (var k = 0, attrs = node.attributes || [], l = attrs.length; k < l; ++k) {
		        	if (GAttrs[attrs.item(k).nodeName] != null) {
		        		/* Don't save g-<attrs>, they will be in 'g-attrs' key in nodeData */
		        		continue;
		        	}
		            nodeData[attrs.item(k).nodeName] = attrs.item(k).value;
		        }
		        
		        if (node.children && node.children.length)
		            nodeData['children'] = getTree(node.children);
	
		        nodeData['node'] = node;
		        nodeData['bindings'] = parseNodeBinds(node);
		        nodeData['g-attrs'] = parsegAttrs(node);
		        nodesData.push(nodeData);
		    }
		    return nodesData;
		}
	
		var parseNodeBinds = function (node) {
			var binddata = [];
	
			if (node.tagName != 'INPUT' && (node.nodeType == Node.ELEMENT_NODE && node.getAttribute('g-bind') == null && node.getAttribute('g-bind-html') == null)) {
				var child = node.firstChild;
				var source = "";
				while(child) {
				    if (child.nodeType !== 3) {
				    	child = child.nextSibling;
				    	continue;
				    }
			        source = child.nodeValue;
					var properties = source.match(Regex.bind);
					if (properties != null) {
						var nodebinddata = {
							source : source,
							html : false, /* If one binding is an html binding, set all the bundle as html */
							properties : null
						};
						for (var i in properties) {
							var propertyData = {
								name : null,
								html : false,
								isAttr : false,
								node : child
							}
							var bind = properties[i];
							if (bind.match(Regex.bind_html)) {
								propertyData.html = true;
								nodebinddata.html = true;
								propertyData.node = child.parentNode;
								nodebinddata.node = child.parentNode;
							}
							bind = bind.replace(Regex.clean_bind, "").trim();
							propertyData.name = bind;
							properties[i] = propertyData;
						}
						nodebinddata.properties = properties;
						binddata.push(nodebinddata)
					}
				    child = child.nextSibling;
				}
			} else { /* Input or ELEMENT_NODE with g-bind attribute. */
				var source = "";
		        source = node.nodeType == Node.ELEMENT_NODE ? (node.getAttribute('g-bind') || node.getAttribute('g-bind-html')) : node.textContent;
		        if (source == null)
		        	return binddata;
				var properties = source.split(',');
				if (properties != null) {
					var nodebinddata = {
						source : source,
						html : false, /* If one binding is an html binding, set all the bundle as html */
						properties : null
					};
					for (var i in properties) {
						var propertyData = {
							name : null,
							html : false,
							isAttr : true,
							node : node
						}
						var bind = properties[i];
						if (bind.match(Regex.bind_html)) {
							propertyData.html = true;
							nodebinddata.html = true;
						}
						bind = bind.replace(Regex.clean_bind, "").trim();
						propertyData.name = bind;
						properties[i] = propertyData;
					}
					nodebinddata.properties = properties;
					binddata.push(nodebinddata);
				}
			}
			return binddata;
		}
	
		var parsegAttrs = function (node) {
			if (node.nodeType !== Node.ELEMENT_NODE)
				return [];
			var gAttributes = {};
			var gAttrDefinition;
			var attr;
			for (var gAttr in GAttrs) {
				gAttrDefinition = GAttrs[gAttr];
				if ((attr = node.getAttribute(gAttr)) != null) {
					gAttributes[gAttr] = gAttrDefinition.parse ? gAttrDefinition.parse.call(null, attr, node) : attr;
				}
			}
			return gAttributes;
		}
	
		return {
			parse : parse
		}
	});
	
	/* Module core/template-loader */
	define('core/template-loader', ['plugins/html','core/template-builder'], function (html, TemplateBuilder) {
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
	});
	
	/* Module todo-views */
	define('todo-views', ['plugins/dom!body','core/template-loader!templates/add.html','core/template-loader!templates/list.html'], function (dom, tAdd, tList) {
		
		var body = dom[0];
	
		tAdd.renderIn(body);
		tList.renderIn(body);
	
		return {
			add : tAdd,
			list : tList
		}
	});
	
	/* Module todo-controller */
	define('todo-controller', ['todo','todo-views'], function (model, views) {
		var viewAdd = views.add;
		var viewList = views.list;
	
		var KEY_U = 85,
			KEY_D = 68,
			KEY_UP = 38,
			KEY_DOWN = 40;
		var ENTER = 13;
		var SHORTCUTS = [KEY_D, KEY_U];
		var ARROWS = [KEY_UP, KEY_DOWN];
	
		strings = {
			appName : "Todo <i>App</i>",
			newTodoText : "New task:",
			help : {
				add : [
					"←┘: 	Add new todo",
					"Ctrl+u: Add new todo with @urgent tag",
					"Ctrl+d: Add new todo with @done tag",
					"Add @u; in todo name: Add new todo with @urgent tag",
					"Add @d; in todo name: Add new todo with @done tag",
					"Add #&lt;tagname1&gt;[,&lt;tagname2&gt;,...,&lt;tagname3&gt;]; in todo name: Add tags in todo"
				],
				list : [
					"↑: 		Previous todo",
					"↓: 		Next todo",
					"Ctrl+↑: 	Jump 10 todos backward",
					"Ctrl+↓: 	Jump 10 todos forward",
					"Ctrl+Shift+↑:	Swap todo with the previous sibling",
					"Ctrl+Shift+↓: 	Swap todo with the next sibling",
					"Ctrl+d: 	Tag todo as @done",
					"Ctrl+u: 	Tag todo as @urgent",
					"Ctrl+Shift+d: 	Delete todo",
					"Left todo name empty: Removes todo",
					"Add #&lt;tagname1&gt;[,&lt;tagname2&gt;,...,&lt;tagname3&gt;]; in todo name: Add tags in todo"
				]
			}
		}
	
		strings.help.add = strings.help.add.map(function(shortc) {
			return "<pre>" + shortc + "</pre>";
		})
	
		strings.help.list = strings.help.list.map(function(shortc) {
			return "<pre>" + shortc + "</pre>";
		})
	
		inputs = {
			todoName : ""
		}
	
		var todos = [];
	
		var component_input_todo = viewAdd.component('new-todo');
		var component_button_new = viewAdd.component('add-new');
		var component_list_todos = viewList.component('{comments...} list');
		
		if (Object.prototype.toString.call(list) != "[object Object]") {
			list = {
				todos : [
					new model("Gekko: Update PHP JWT to v2.0 (fixed security bug)", false, true, ['php-engine','jwt', 'security']),
					new model("c.js: Add a template event to fire GAttrs if g-watch isn't present.", false, false),
					new model("amlc.js: Compile shimed modules (currently supporting 'exports' property).", false, false),
					new model("amlc.js: Add support for plugins.", false, false),
					new model("aml.js: When plugins using 'ajax' fail, throw error to avoid module.run() keep triyng to retrieve the file.", false, false)
				]
			}
		}
	
		component_list_todos.setAdapter(function (todo) {
			var template = [
				"<input g-type='input' type='text' g-bind='name' />",
				"<b g-show-if='isDone' g-watch='done'> @done</b>",
				"<b class='urgent' g-watch='urgent,done' g-show-if='isUrgent'> @urgent</b>",
				" <b class='tags' g-watch='customTags' g-bind='printTags()'></b>"
			].join('');
	
			var adapter = {
				template : template,
				classes : (todo.done ? 'done ' : '') + 'todo',
				trackBy : 'uid'
			}
	
			return adapter;
		});
		
		viewAdd.bind(strings);
		viewAdd.bind(inputs);
		viewList.bind(list);
		viewList.bind(strings);
	
		var uiBehaviour = function () {
			var click_focusedInput = null;
			var deletedTodo = null;
			return {
				rowClick : function (todo, evt, li) {
					if (click_focusedInput == null || click_focusedInput != li) {
						click_focusedInput = li;
					} else {
						todo.done = !todo.done;
					}
				},
				rowKeydown : function (todo, evt, li) {
					if (ENTER != evt.keyCode && SHORTCUTS.indexOf(evt.keyCode) == -1 && ARROWS.indexOf(evt.keyCode) == -1)
						return;
	
					if (evt.ctrlKey && evt.keyCode == KEY_U) {
						todo.urgent = !todo.urgent;
						evt.preventDefault();
					}
	
					if (evt.ctrlKey && evt.keyCode == KEY_D) {
						todo.done = !todo.done;
						evt.preventDefault();
					}
					
					if (evt.ctrlKey && evt.keyCode == KEY_D && evt.shiftKey) {
						deletedTodo = todo;
						var sibling = li.nextSibling || li.previousSibling;
						list.todos.splice(list.todos.indexOf(todo), 1);
						if (sibling != null)
							sibling.firstChild.focus();
						evt.preventDefault();
					}
	
					if (evt.keyCode == ENTER) {
						(evt.target || evt.srcElement).blur();
						(evt.target || evt.srcElement).focus();
						evt.preventDefault();
					}
	
					if (ARROWS.indexOf(evt.keyCode) > -1) {
						if (evt.ctrlKey && evt.shiftKey) {
							var index = list.todos.indexOf(todo);
							if (evt.keyCode == KEY_UP) {
								if (index == 0)
									return;
								/* Fix for IE9 to prevent blur after redraw the element.*/
								var keepFocus = function (evt) {
									li.removeEventListener('blur', arguments.callee, true);
									(evt.target || evt.srcElement).focus();
								}
								li.addEventListener('blur', keepFocus, true);
								/**/
								var prev = list.todos[index-1];
								list.todos[index-1] = list.todos[index];
								list.todos[index] = prev;
							} else {
								if (index == list.todos.length -1)
									return;
								var next = list.todos[index+1];
								list.todos[index+1] = list.todos[index];
								list.todos[index] = next;
							}
						} else if (evt.ctrlKey) {
							var step = 10;
							var s = li;
							if (evt.keyCode == KEY_UP){
								while(step-- > 0) {
									if (s.previousSibling == null)
										break;
									s = s.previousSibling;
								}
								s.firstChild.focus();
							} else if (evt.keyCode == KEY_DOWN && (s = li.nextSibling) != null){
								while(--step > 0) {
									if (s.nextSibling == null)
										break;
									s = s.nextSibling;
								}
								s.firstChild.focus();
							}
						} else {
							var s = null;
							if (evt.keyCode == KEY_UP && (s = li.previousSibling) != null){
								s.firstChild.focus();
							} else if (evt.keyCode == KEY_DOWN && (s = li.nextSibling) != null){
								s.firstChild.focus();
							}
						}
						evt.preventDefault();
					}
				},
				rowBlur : function (todo, evt, row) {
					if (todo == null)
						return;
	
					if (todo != null && todo.name == "") {
						list.todos.splice(list.todos.indexOf(todo), 1);
					}
	
					if (deletedTodo != null) {
						var s = row.previousSibling;
						if (s == null) 
							s = row.nextSibling;
						if (s == null)
							return;
						s.firstChild.focus();
						deletedTodo = null;
						return;
					}
					var todoName = todo.name;
					var hasCustomTags = todoName.match(/#[a-zA-Z0-9,-_]+;/) != null;
					var customTags = [];
					if (hasCustomTags && todo.customTags != customTags) {
						customTags = /#([a-zA-Z0-9,-_]+);/.exec(todoName)[1].split(',');
						todoName = todoName.replace(/#([a-zA-Z0-9,-_]+);/, "");
						todo.name = todoName;
						todo.setTags(customTags);
					}
				}
			}
		}
	
		component_list_todos.on(uiBehaviour());
	
		component_button_new.on({
			click : function () {
				addNewTodo();
			}
		});
	
		component_input_todo.on({
			keydown : function (evt) {
				if (evt.keyCode === 13) {
					addNewTodo();
				} else if (evt.ctrlKey && SHORTCUTS.indexOf(evt.keyCode) > -1) {
					var tags = {
						done : evt.ctrlKey && evt.keyCode == KEY_D,
						urgent : evt.ctrlKey && evt.keyCode == KEY_U
					}
					addNewTodo(tags);
					evt.preventDefault();
				}
			}
		})
	
		
	
		function addNewTodo (tags) {
			var todoName = inputs.todoName;
			if (todoName.length == 0)
				return;
	
			tags = tags || {};
	
			var hasCustomTags = todoName.match(/#[a-zA-Z0-9,-_]+;/) != null;
			var customTags = [];
			if (hasCustomTags) {
				customTags = /#([a-zA-Z0-9,-_]+);/.exec(todoName)[1].split(',');
				todoName = todoName.replace(/#([a-zA-Z0-9,-_]+);/, "");
			}
	
			var isUrgent = tags.urgent || todoName.match(/(\s*@u;)$/g) != null;
			todoName = todoName.replace(/(\s*@u;)$/g, "");
	
			var isDone = tags.done || todoName.match(/(\s*@d;)$/g) != null;
			todoName = todoName.replace(/(\s*@d;)$/g, "");
	
			var todo = new model(todoName, isDone, isUrgent, customTags);
			list.todos.push(todo);
			inputs.todoName = "";
		}
	});
	
	/* Module components/list */
	define('components/list', ['components/base','core/events','core/build-html-element','core/template-builder'], function (Base, $events, BuildHtmlElement, TemplateBuilder) {
		function List (nodedata) {
			var $self = this;
			$self.el = nodedata.node;
			$self.source = null;
	
			var isHtml = nodedata['g-bind-html'] != null;
			var prevState = null;
			var track = {};
			
			/* Row adapter to let users adapt their data to 'li' elements */
			var rowAdapter;
			$self.setAdapter = function (_adapter) {
				rowAdapter = _adapter;
				return $self;
			}
	
			/* Bind handlers defined by users */
			var bindsHandlers = {}
	
			var commonEventHandler = function(li, event) {
				var handler = function (evt) {
					var index = li.getAttribute('data-index');
					var elem = $self.source[index];
					runBindHandlersFor(event, [elem, evt, li]);
					render($self.source);
				};
				return handler;
			}
			/* Binds registered for this component */
			var rowEvents = {
				rowClick : function (li) {
					if (bindsHandlers['rowClick'] == null) 
						return;
					if (li.addEventListener) {
						li.addEventListener('click', commonEventHandler(li, 'rowClick'), true);
					} else if (li.attachEvent) {
						li.attachEvent('click', commonEventHandler(li, 'rowClick'));
					}
				},
				rowKeydown : function (li) {
					if (bindsHandlers['rowKeydown'] == null) 
						return;
					if (li.addEventListener) {
						li.addEventListener('keydown', commonEventHandler(li, 'rowKeydown'), true);
					} else if (li.attachEvent) {
						li.attachEvent('keydown', commonEventHandler(li, 'rowKeydown'));
					}
				},
				rowBlur : function (li) {
					if (bindsHandlers['rowBlur'] == null) 
						return;
					if (li.addEventListener) {
						li.addEventListener('blur', commonEventHandler(li, 'rowBlur'), true);
					} else if (li.attachEvent) {
						li.attachEvent('blur', commonEventHandler(li, 'rowBlur'));
					}	
				},
				rowFocus : function (li) {
					if (bindsHandlers['rowFocus'] == null) 
						return;
					if (li.addEventListener) {
						li.addEventListener('focus', commonEventHandler(li, 'rowFocus'), true);
					} else if (li.attachEvent) {
						li.attachEvent('focus', commonEventHandler(li, 'rowFocus'));
					}	
				}
			}
	
			/* Override Components/Base to allow custom binds. */
			$self.on = function (binds) {
				for (var i in binds) {
					var name = $self.attribute2camelCase(i);
					if (rowEvents[name] != null) {
						if (bindsHandlers[name] == null)
							bindsHandlers[name] = [];
						bindsHandlers[name].push(binds[i]);
					} else {
						var ev = {}
						ev[name] = binds[name];
						Base.prototype.on.call($self, ev);
					}
				}
				var li = $self.el.querySelector('li[data-index]');
				if (li == null)
					return;
				while(li) {
					if (li.nodeType != Node.ELEMENT_NODE || li.getAttribute('data-index') == null) {
						li = li.nextSibling;
						continue;
					}
					for (var i in rowEvents) {
						rowEvents[i].call(null, li);
					}
					li = li.nextSibling;
				}
			}
	
			/* Run bind handlers registrated by users*/
			var runBindHandlersFor = function(bindName, args) {
				bindName = $self.attribute2camelCase(bindName);
				var handlers = bindsHandlers[bindName];
				for (var i in handlers) {
					handlers[i].apply(this, args);
				}
			}
	
			$self.bind = function (properties, source) {
				$self.source = $self.template.getValue(source, properties[0].name);
				render($self.source);
			}
	
			/* Render the component */
			var render = function (source, adapter) {
				resetTrackedState();
				source = source.filter(function (el) {
					return el != null;
				})
	
				if (adapter == null && rowAdapter == null) { /* There's no trackBy */
					var li = $self.el.firstChild;
					while(li) {
						var holdRef = li.nextSibling;
						if (li.nodeType != Node.ELEMENT_NODE || li.getAttribute('data-index') == null) {
							li = li.nextSibling;
							continue;
						}
						$self.el.removeChild(li);
						li = holdRef;
					}
				}
	
				for (var i in source) {
					var s = source[i];
					var data = null;
					
					if (adapter != null) {
						data = adapter(s);
					} else if (rowAdapter != null) {
						data = rowAdapter(s);
					} else {
						data = {};
						if (isHtml) {
							data.html = s;
						} else {
							data.value = s;
						}
					}
					if (data.trackBy != null) {
						var li = null;
						if (!isTracked(s[data.trackBy])) {
							li = document.createElement('li');
							li.setAttribute('data-index', i);
	
							track[s[data.trackBy]] = {
								source : s,
								element : li,
								exists : true
							};
	
	
							if (data.value) {
								li.textContent = data.value;
							} else if (data.html) {
								li.innerHTML = data.html;
							} else if (data.template) {
								TemplateBuilder.parse(BuildHtmlElement(data.template), function (template) {
									template.bind(s);
									template.renderIn(li);
								})
							}
							for (var i in rowEvents) {
								rowEvents[i].call(null, li);
							}
							if (data.classes)
								li.className = data.classes;
							$self.el.appendChild(li);
						} else {
							var tracked = getTracked(s[data.trackBy]);
							tracked.exists = true;
							li = tracked.element;
							/* Is a swap only if the length of previous state of source and current source are equals */
							if (li.getAttribute('data-index') != i && prevState.length == source.length) {
								swap(li, i);
							}
	
							if (data.value) {
								li.textContent = data.value;
							} else if (data.html) {
								li.innerHTML = data.html;
							}
							if (data.classes)
								li.className = data.classes;
						}
					} else {
						var li = document.createElement('li');
						li.setAttribute('data-index', i);
	
						track[s[data.trackBy]] = {
							source : s,
							element : li,
							exists : true
						};
	
	
						if (data.value) {
							li.textContent = data.value;
						} else if (data.html) {
							li.innerHTML = data.html;
						} else if (data.template) {
							TemplateBuilder.parse(BuildHtmlElement(data.template), function (template) {
								template.bind(s);
								template.renderIn(li);
							});
						}
						for (var i in rowEvents) {
							rowEvents[i].call(null, li);
						}
						if (data.classes)
							li.className = data.classes;
						$self.el.appendChild(li);
					}
				}
	
				var tmp = {};
				for (var j in track) {
					tmp[j] = track[j];
				}
				for (var i in tmp) {
					if (!tmp[i].exists) {
						var sibling = track[i].element.nextSibling;
						try {
							$self.el.removeChild(track[i].element);
							delete track[i];
							if (sibling != null) {
								var i = tmp[i].element.getAttribute('data-index');
								while(sibling) {
									sibling.setAttribute('data-index', sibling.getAttribute('data-index')-1);
									sibling = sibling.nextSibling;
								}
							}
						} catch (e) {
	
						}
					}
				}
				prevState = Array.prototype.concat.call(source);
			}
	
			var swap = function (li, newI) {
				var focusedOn = document.activeElement;
				var oldI = li.getAttribute('data-index');
				var otherLi = li.parentNode.querySelector('li[data-index="' + newI + '"]');
				li.setAttribute('data-index', newI);
				otherLi.setAttribute('data-index', oldI);
				otherLi.insertAdjacentElement('beforebegin', li);
				focusedOn.focus();
			}
	
			var resetTrackedState = function () {
				for (var i in track) {
					track[i].exists = false;
				}
			}
	
			var isTracked = function (trackedBy) {
				return track[trackedBy] != null;
			}
	
			var getTracked = function (trackedBy) {
				return track[trackedBy] ? track[trackedBy] : null;
			}
		}
	
		Base.prototype.asPrototypeOf(List);
	
		return List;
	});
	
	/* Entry point */
	require(['todo-controller','plugins/css!assets/style.css'], function (tc) {
	});
	
	
})(this);