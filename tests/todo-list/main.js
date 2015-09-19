
require({
	baseUrl : 'src',
	paths : {
		plugins : '../plugins'
	}
},	
[
	'todo-controller',
	'plugins/css!assets/style.css'
],
function (tc) {
});