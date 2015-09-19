define([
	'components/base',
	'core/events',
	'core/build-html-element',
	'core/template-builder'
], function (Base, $events, BuildHtmlElement, TemplateBuilder) {
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
			if (otherLi.insertAdjacentElement)
				otherLi.insertAdjacentElement('beforebegin', li);
			else
				otherLi.parentNode.insertBefore(otherLi, li);
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