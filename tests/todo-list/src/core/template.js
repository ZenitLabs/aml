define([
	'core/events',
	'core/g-attrs',
	'core/vars/html-tags',
	'core/vars/regex'
], function ($events, GAttrs, HTMLTags, Regex) {
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
})