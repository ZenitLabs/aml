define([
	'todo',
	'todo-views'
], 
function (model, views) {
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
	var component_list_todos = viewList.component('{can make comments to clarify the name or selector} list');
	
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

		var hasCustomTags = todoName.match(/#[a-zA-Z0-9,-_ ]+?;/) != null;
		var customTags = [];
		if (hasCustomTags) {
			customTags = /#([a-zA-Z0-9,-_ ]+?);/.exec(todoName)[1].split(',');
			todoName = todoName.replace(/#([a-zA-Z0-9,-_ ]+?);/, "");
		}

		var isUrgent = tags.urgent || todoName.match(/(\s*@u;)/g) != null;
		todoName = todoName.replace(/(\s*@u;)/g, "");

		var isDone = tags.done || todoName.match(/(\s*@d;)/g) != null;
		todoName = todoName.replace(/(\s*@d;)/g, "");

		var todo = new model(todoName, isDone, isUrgent, customTags);
		list.todos.push(todo);
		inputs.todoName = "";
	}
});