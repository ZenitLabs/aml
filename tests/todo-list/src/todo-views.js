define([
	'plugins/dom!body',
	'core/template-loader!templates/add.html',
	'core/template-loader!templates/list.html'
], 
function (dom, tAdd, tList) {
	/* dom is an array containing the elements with tagName 'body' */	
	var body = dom[0];

	/* tAdd and tList are HTML templates that are parsed to obtain components and attributes. */
	/* template.renderIn(HTMLElement) renderize the template in an HTML element */
	tAdd.renderIn(body);
	tList.renderIn(body);

	return {
		add : tAdd,
		list : tList
	}
})