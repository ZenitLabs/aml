define([
	'require',
	'core/events',
	'./template',
	'./g-attrs',
	'./vars/html-tags',
	'./vars/regex'
], function (req, $events, Template, GAttrs, HTMLTags, Regex) {	

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
})