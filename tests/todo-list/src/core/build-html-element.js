define(function () {
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