define([],
function () {
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