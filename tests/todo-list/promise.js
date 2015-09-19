(function (global) {

	var isFunction = function (o) {
        return Object.prototype.toString.call(o) === '[object Function]';
    }

    var STATUS = {
    	PENDING: 0,
    	FULFILLED: 1,
    	REJECTED: 2
    }

	function Promise (resolver) {
		if (!(this instanceof Promise))
			throw new TypeError("undefined is not a promise");

		if (!isFunction(resolver))
			throw new TypeError("Promise resolver " + resolver + " is not a function.");

		var $self = this;
		/* Pending - Fulfilled - Rejected
		 *	Pending -> MAY transition to Fulfilled or Rejected
		 *	Fulfilled -> MUST not transition. Has a final 'value' (which MUST not change).
		 *	Rejected -> MUST not transition. Has a final 'reason' (which MUST not change).
		 */
		this.$state = STATUS.PENDING;

		/*
		 * Value of a fulfilled promise, or reason if the promise was rejected.
		 */
		this.$result;

		/*
		 * Fulfilled promise handler
		 */
		var onFulfilledPromise = [];

		/*
		 * Rejected promise handler
		 */
		var onRejectedPromise = [];

		/*
		 * Exception handler
		 */
		var onCatch;

		this.$addFulfilledHandler = function (handler) {
			onFulfilledPromise.push(handler);
		}

		this.$addRejecteddHandler = function (handler) {
			onRejectedPromise.push(handler);
		}

		var ResolvePromise = function (promise, value) {
			promise.$state = STATUS.FULFILLED;
			onFulfilledPromise.forEach(function (handler) {
				handler(value);
			})
		}

		var RejectPromise = function (promise, value) {
			promise.$state = STATUS.REJECTED;
			onRejected.forEach(function (handler) {
				handler(value);
			})
		}

		var fulfill = function (value) {
			$self.$result = value;
			ResolvePromise($self, value);
		}

		var reject = function (reason) {
			$self.$result = reason;
			RejectPromise($self, value);
		}

		if (isFunction(resolver))
			resolver(fulfill, reject);
	}

	Promise.prototype = {
		then: function (onFulfilled, onRejected) {
			if (isFunction(onFulfilled)) {
				this.$addFulfilledHandler(onFulfilled);
				if (this.$state == STATUS.FULFILLED)
					onFulfilled(this.$result);
			}

			if (isFunction(onRejected)) {
				this.$addRejecteddHandler(onRejected);
				if (this.$state == STATUS.REJECTED)
					onFulfilled(this.$result);
			}

			return (promise = new Promise(function(){}));
		},
		catch: function (catchHandler) {
			onCatch = catchHandler;
		}
	}

	window.P = Promise;
})(this);

p = new P(function(resolve, reject) { 
	var i =0;
	var siid = setInterval(function(){
		i++;
		if (i==500) {
			clearInterval(siid);
			resolve('mundo');
		}
	});
});

var t = p.then(function (who) {
	console.log("Hola " + who + "!");
})

p.then(function (who) {
	console.log("Chau " + who + "!");
})