/*
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Leonardo Brugnara - Zenit Labs
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var require, define, aml;
(function(global){
    'use strict';
    /*== CORE FUNCTIONS ==*/
    var $require,           /* Local require */
        $define,            /* Local define */
        $resolve,           /* Function to resolve dependencies for modules.*/
        $onload,            /* When external file is loaded, $load triggers $onload to complete modules definition */
        $shimModule,        /* Get shim config to obtain module dependencies and factory */
        $load,              /* Creates a script tag and import resource from the external file referred by the 'src' attribute. (Override for another way to import modules) */
        $normalize,         /* Resolves Module's Relative ID to a Top-Level ID */
        $filename,          /* This function find and returns the filename for a module ID */
        $loadWithPlugin,    /* Load resources that must be loaded with a plugin */
        $normalizePlugin,   /* Normalize a resource name to be loaded with a plugin */
        $needsPlugin,       /* Check if module ID contains a '!' to be loaded with a plugin */
        $getPluginData,     /* Get plugin name and resource name from moduleID */
        $mapArgs;           /* Parse arguments of 'define' and 'require' calls and returns an object with the arguments 'id', 'config', 'dependencies', 'factory' */
    
    /*== MODULES ==*/
    var $AmlContext,    /* Keeps track of the core state in aml.js like load and run status of modules and type of action (require or define) */
        $Modules,       /* Handle the creation, definition and execution of the modules. */
        $Events;        /* Event system */

    var cjs = {module: null};
    var COMMONJS_DEPS = ['require', 'exports', 'module'];
    var REGEX_CJS = /\(\s*require\s*(,\s*exports\s*)*(,\s*module\s*)?\)/gm;
    var REGEX_COMMENTS = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
    var REGEX_DEPS = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g;
    
    /*== OBJECTS ==*/
    /* aml.js and module's defualt configuration */
    var $config = {
        baseUrl : './',
        /* 'name' : '<path|url>' */
        paths : {},
        /* 'prefix' : object */
        map: {},
        /* 'name' : { deps : [], export : <string>, init : <obj|func> } */
        shim : {},
        packages : {}
    };

    /* aml.js settings */
    var $aml = {
        strict : false,
        debug : true,
        log : {
            debug : true,

            /* 'all', 'error', 'info', 'warn' */
            level : ['all'],

            /* {'all' => shows all logs} | {'tag' => shows 'tag' logs} | {'~tag' => doesn't show 'tag' logs} */
            tags : ['all', "~Custom"]
        }       
    };
    
    /*== CONSTANTS ==*/
    var ROOT_CONTEXT = 'aml-root';

    /*== HELPER FUNCTIONS ==*/
    var extend = function (target, source) {
        var keys = Object.keys(source),
            key,
            i;
        for (i = 0; i < keys.length; i += 1) {
            key = keys[i];
            if (Object.prototype.toString.call(source[keys[i]]) == "[object Object]" && target[key] != null) {
                target[key] = extend(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    };

    var isObject = function (o) {
        return Object.prototype.toString.call(o) === '[object Object]';
    };

    var isString = function (o) {
        return Object.prototype.toString.call(o) === '[object String]' && typeof o === 'string';
    };

    var isFunction = function (o) {
        return Object.prototype.toString.call(o) === '[object Function]';
    };

    var isArray = function (o) {
        return Object.prototype.toString.call(o) === '[object Array]' && o instanceof Array;
    };

    /**
     * Get module base path from its ID */
    var buildPath = function (module) {
        if (module == null || module == '/') {
            return "/";
        }
        var paths = module.split('/');
        var path = null;
        if (paths.length == 1) {
            return "/";
        }
        paths.pop();
        path = paths.join("/");
        return path;

    };

    /**
     * Returns current config. If 'newConfig' is provided, first, it's merged with global $config */
    var getConfig = function (newConfig) {
        if (newConfig == null) {
            return $config;
        }
        extend($config, newConfig);
        return $config;
    };

    /**
     * Returns the filenmae from a resource name/ID */
    var toUrl = function (resource) {
        var config = getConfig();
        var modulePath = this.path;
        var MID = $normalize(resource, modulePath, config);
        var id = MID.absolute;
        var filename = $filename(MID, config);
        return filename;
    };

    /**
     * Build module and module.exports. If global config has a 'config' key with 
     * specific configurations for module 'name', add these configs. to module object */
    var buildcjs = function (name) {
        return {
            exports : {

            }, config : function() {
                var config = getConfig();
                if (config != null && config.config != null && config.config[name] != null) {
                    return config.config[name];
                }
                return {};
            }
        };
    };

    var isIE = function () {
        if (global.navigator == null) {
            return false;
        }
        var undef, rv = -1; // Return value assumes failure.
        var ua = global.navigator.userAgent;
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

    /*== DOM Elements ==*/
    var $head = document.getElementsByTagName('head')[0];
    var $start = document.querySelector('script[data-main]');

    /*== MODULES ==*/
    $Modules = (function(){
        /**
         * Modulos registrados
         */
        var modules = [];
        
        /**
         * Modulos creados cuya registración esta diferida
         */
        var deferred = [];

        /**
         * Crea un nuevo modulo
         */
        var create = function (id, dependencies, factory, dynamic) {
            var args = $mapArgs(id, dependencies, factory, dynamic);
            return new Module(args.dependencies, args.factory, args.id, args.dynamic);
        };

        /**
         * Agrega un nuevo modulo
         */
        var add = function (module) {
            if (!(module instanceof Module)) {
                throw new Error('module in $Modules.add must be instance of Module, ' + typeof module + ' given.');
            }
            modules.push(module);
        };

        /**
         * Crea y agrega un modulo
         */
        var newModule = function (id, dependencies, factory, dynamic) {
            var args = $mapArgs(id, dependencies, factory, dynamic);
            var m = new Module(args.dependencies, args.factory, args.id, args.dynamic);
            modules.push(m);
            return m;
        };

        var deleteModule = function (id) {
            if (!exists(id)) {
                return false;
            }
            var m = fetch(id);
            var i = -1;
            if ((i = modules.indexOf(m)) > -1)
                modules.splice(i,1);
            if ((i = deferred.indexOf(m)) > -1)
                deferred.splice(i,1);
        };

        /**
         * Devuelve, si existe, el modulo identificado por {@param id}
         */
        var fetch = function (id) {
            for (var i=0; i < modules.length; i++) {
                if (modules[i].amI(id))
                    return modules[i];
            }
            for (var i=0; i < deferred.length; i++) {
                if (deferred[i].amI(id))
                    return deferred[i];
            }
            return null;
        };

        /**
         * Si existe el modulo referenciado por
         * {@param id}, retorna true.
         */
        var exists = function (id) {
            for (var i=0; i < modules.length; i++) {
                if (modules[i].amI(id))
                    return true
            }
            return false;
        };

        var all = function () {
            return modules;
        };

        var dump = function (module) {
            if (module != null && isString(module)) {
                if( !exists(module) ) {
                    return;
                }
                modules.map(function(el){
                    if (el.getID() === module)
                        console.error("DEFINED");
                })
                deferred.map(function(el){
                    if (el.getID() === module)
                        console.error("DEFERRED");
                })
                fetch(module).dump();
                return;
            } else if (module != null && module) {
                console.error("DEFINED");
                for (var i in modules) 
                    console.debug(modules[i].getID());
                console.error("DEFERRED");
                for (var i in deferred) 
                    console.debug(deferred[i].getID());
            } else {
                console.error("DEFINED");
                for (var i in modules) 
                    modules[i].dump();
                console.error("DEFERRED");
                for (var i in deferred) 
                    deferred[i].dump();
            }
        };

        /**
         * Objeto Module para almacenar los modulos definidos.
         */
        var Module = function (dependencies, factory, id, dynamic) {
            var id = id || null;
            var dependencies = dependencies;
            var factory = factory;
            var result;
            var shim = false;
            var loading = false;
            var loaded = false;
            var subscribers = [];
            var defined = false;
            var isPlugin = false;
            var dynamic = dynamic != undefined ? dynamic : false;

            this.getDependencies = function () {
                return dependencies;
            }

            this.setDependencies = function (deps) {
                dependencies = deps;
            }

            this.hasAsDependency = function (id) {
                return dependencies != null && dependencies.indexOf(id) > -1;
            }

            this.setFactory = function (f) {
                factory = f;
            }

            this.getFactory = function (f) {
                return factory;
            }

            this.setAsLoading = function () {
                loading = true;
            }

            this.loadingDone = function () {
                loading = false;
                loaded = true;
                for (var i in subscribers) {
                    var subscriber = subscribers[i];
                    subscriber.call(global, id);
                }
            }

            this.loaded = function () {
                return loaded;
            }

            this.isShim = function(val) {
                if (val == null) {
                    return shim;
                }
                shim = val;
            }

            this.isPlugin = function (val) {
                if (val == null) {
                    return isPlugin;
                }
                isPlugin = val;
            }

            this.setAsDefined = function() {
                defined = true;
            }

            this.isDefined = function () {
                return defined;
            }

            this.isReady = function (trace) {
                if (loading || factory === null || factory === undefined) {
                    return false;
                }

                if (trace == null)
                    trace = [];

                if (id != null)
                    trace.push(id);

                if (dependencies != null) {
                    for (var i=0; i < dependencies.length; i++) {
                        var dep = $Modules.fetch(dependencies[i]);
                        
                        if (dep != null && dep.hasAsDependency(id) && trace.indexOf(dep.getID()) > -1) {
                            continue;
                        } else if (dep != null && trace.indexOf(dep.getID()) > -1) {
                            continue;
                        }

                        if (dep == null || !dep.isReady(trace)) {
                            return false;
                        }
                    }
                }
                return true;
            }

            this.setID = function (newId) {
                id = newId;
            }

            this.getID = function () {
                return id;
            }

            /* Returns the absolute path of this module */
            this.getPath = function () {
                if (id == null)
                    return null;
                var paths = id.split('/');
                var path = null;
                if (paths.length == 1) {
                    path = "/";
                } else {
                    paths.pop();
                    path = paths.join("/");
                }
                return path;
            }

            this.amI = function (n) {
                return id === n;
            }

            /* Only for debug purposes. */
            this.run = function (trace) {
                $AmlContext.running(id);
                
                if (result !== undefined && COMMONJS_DEPS.indexOf(id) == -1) {
                    return result;
                }

                if (trace == null)
                    trace = [];

                if (id != null)
                    trace.push(id);

                if (typeof factory === 'function') {
                    var moduleDependencies = dependencies != null ? dependencies : COMMONJS_DEPS.concat();
                    var deps = [];
                    for (var i=0; i < moduleDependencies.length; i++) {
                        var dep = $Modules.fetch(moduleDependencies[i]);

                        /* Si la dependencia del módulo tiene a este último como dependencia, existe una dependencia ciclica entre ambos. Si en 'trace'
                         * existe la dependencia, quiere decir, que dicha dependencia, solicito primero al modulo para ser su dependencia, por lo tanto
                         * su valor será null. Ejemplo:
                         *      define('A', ['B']);
                         *      define('B', ['A']);
                         * Cunado se haga un require(['A'],...) en algún momento se obtendrá
                         *      dep => 'A'
                         *      id => 'B'
                         *      trace => ['A']
                         * y en dicho momento el valor de la dependencia 'A' en el módulo 'B' será null, ya que 'B' estará definida como dependencia
                         * en 'A'.
                         * 'A' puede utilizar a 'B', pero si 'B' necesita utilizar a 'A', deberá hacerlo utilizando require('A') en una función de
                         * retorno que tendrá dicha llamada a require.
                         */
                        if (dep != null && dep.hasAsDependency(id) && trace.indexOf(dep.getID()) > -1) {
                            deps.push(null);
                            continue;
                        }
                        if (dep == null || !dep.isReady()) {
                            $AmlContext.done(id);
                            return null;
                        }

                        if (moduleDependencies[i] === 'require') {
                            dep.args = [this.getPath()];
                        }

                        var res = dep.run(trace);
                        deps.push(res);
                    }

                    result = factory.apply(global, deps) || null;
                } else {
                    result = factory;
                }

                $AmlContext.done(id);

                /* Cuando un plugin es dinamico, se eliminan los recursos cargados por dicho plugin despues
                 * de que los mismos han sido cargados/ejectuados, para producir la carga nuevamente por
                 * medio de una llamada a require. */
                if ($needsPlugin(id)) {
                    var data = $getPluginData(id);
                    var pluginModule = $Modules.fetch(data.plugin);
                    pluginModule.isPlugin(true);
                    if (pluginModule != null && pluginModule.isReady()) {
                        var plugin = pluginModule.run();
                        if (plugin.dynamic != null && plugin.dynamic) {
                            $Modules.delete(id);
                        }
                    }
                }

                if (dynamic) {
                    $Modules.delete(id);
                }

                if ((factory != null && isFunction(factory) && factory.length && factory.toString().match(REGEX_CJS) != null) || dependencies == null) {
                    if (result == null && cjs.module[id].exports != null) {
                        result = cjs.module[id].exports;
                    }
                    if (cjs.module[id] == null) 
                        cjs.module[id] = buildcjs(id);
                    cjs.module[id]['exports'] = result;
                    cjs.module[id]['id'] = id;
                }

                return result;
            }

            this.toString = function () {
                var def = null;
                if (isFunction(factory))
                    def = factory.toString().replace(/\n/g, "").replace(/\s{1,}/g, " ")
                else if (isObject(factory))
                    def = JSON.stringify(factory);

                var str = "\n" +
                    "===Dump==="        + "\n" + 
                    "-- ID: " + id      + "\n" + 
                    "-- Dependencies: " + (dependencies != null ? "["    + dependencies.join(", ") + "]" : "{require, exports, module}") + "\n" + 
                    "-- Factory: "      + def.substr(0, 400) + "\n" + 
                    "-- Ready: "        + this.isReady() + "\n" + 
                    "==========";
                return str;
            }

            this.dump = function () {
                console.info(this.toString())
            }
        }

        var api = {
            create      : create,
            add         : add,
            new         : newModule,
            delete      : deleteModule,
            fetch       : fetch,
            exists      : exists,
            all         : all,
            dump        : dump
        }

        if ($aml.debug) {
            api['deferred'] = deferred;
            api['modules']   = modules;
        }
        return api;
    })();

    /**
     * Estado del contexto al momento de un define
     * o require.
     * Si se está cargando un recurso externo,
     * el $AmlContext se encuentra 'loading' por lo
     * tanto se difieren las definiciones de modulos.
     */
    $AmlContext = (function(){
        /**
         * require or define. The modules need to know the current action.
         */
        var $action = null;

        /* External resources that are being imported by $load */
        var $resources = [];

        /* Modules that are resolving dependencies */
        var $running = [];

        /* Set current action to {@param a} */
        var setCurrentAction = function (a) {
            $action = a;
        }

        /* Returns the current $action being executed */
        var getCurrentAction = function () {
            return $action;
        }

        /* Set a module as 'loading' by the AML context */
        var loading = function (moduleID) {
            $resources.push(moduleID);
        }

        /* Check if module is being loaded by AML context */
        var isLoading = function (moduleID) {
            if (moduleID != null)
                return $resources.indexOf(moduleID) > -1;
            return $resources.length > 0;
        }

        /* Returns the current module's being loaded by AML context, or all the modules're being loaded. */
        var whoIsLoading = function (showStack) {
            if (showStack != null && showStack)
                return $resources.slice();
            return $resources.length > 0 ? $resources[$resources.length-1] : null;
        }

        /* Remove loaded module from $resources stack. */
        var loaded = function (moduleID) {
            var i = $resources.indexOf(moduleID);
            if (i == -1)
                return;
            $resources.splice(i,1);
        }

        /* Set module as running. This means the module who is resolving its dependencies. */
        var running = function (id) {
            if (id == null)
                id = ROOT_CONTEXT;
            $running.push(id);
        }

        /* Returns the current module's resolving its dependencies, or all the modules're resolving their dependencies. */
        var whoIsRunning = function (showStack) {
            if (showStack != null && showStack)
                return $running.slice();
            return $running.length > 0 ? $running[$running.length-1] : null;
        }

        /* When module finally resolve its dependencies and run the factory function, is loaded in the AML context */
        var done = function () {
            var result = $running.pop();
            return result;
        }

        /* Public API */
        return {
            loading         : loading,
            loaded          : loaded,
            isLoading       : isLoading,
            whoIsLoading    : whoIsLoading,
            running         : running,
            done            : done,
            whoIsRunning    : whoIsRunning,
            setCurrentAction : setCurrentAction,
            getCurrentAction : getCurrentAction
        };
    })();

    /* Event system */
    $Events = (function(){
        var $events = {};
        var broadcast = function (name, args) {
            var listeners = $events[name];
            if (listeners == null)
                return;
            for (var i=0; i < listeners.length; i++) {
                var oldArgs = listeners[i][1] || [];
                var newArgs = oldArgs.concat().concat(args);
            
                listeners[i][0].apply(global, newArgs);
            }
        }

        var listen = function (name, callback, args) {
            if ($events[name] == null)
                $events[name] = [];
        
            $events[name].push([callback, args]);
        }

        var remove = function (name) {
            delete $events[name];
        }

        return {
            broadcast : broadcast,
            listen : listen,
            remove : remove
        }
    })();

    /**
     * Define new modules
     */
    $define = function (id, dependencies, factory) {
        var args = $mapArgs(id, dependencies, factory);
        
        /**
         * If Browser is IE and module definition doesn't contains an ID, obtain the module name from the script
         * with the readyState 'interactive' (currently running). */
        if (isIE && args.id == null) {
            var scripts = document.querySelectorAll('script');
            for(var i in scripts) {
                if (scripts[i].getAttribute && scripts[i].readyState === 'interactive') {
                    args.id = scripts[i].getAttribute('data-module');
                }
            }
        }

        var define = function (args, who) {
            $AmlContext.setCurrentAction('define');
            var module = $Modules.new(args.id || who, args.dependencies, args.factory, args.dynamic);
            module.setAsDefined();
        }
        /* Si el ID es nulo, hay que esperar que nos notifiquen que hay un modulo q cargar
         * En un navegador, esto lo hace el onload del tag script. Sin embargo, si el ID existe
         * hay que chequear si es el mismo que el que se está cargando. */
        if (args.id == null || ($AmlContext.isLoading(args.id))) {
            $Events.listen('aml-module-loaded', define, [args]);
        } else {
            /* Sino, proceder a la definición del modulo explícitamente definido (con id, deps y factory) */
            define(args);
        }
    }

    /**
     * {@func require} utiliza $resolve para resolver las dependencias del modulo {@param module}.
     */
    var index = 0;
    $resolve = function (dependencies, config, success, id) {
        if (dependencies == null && id != null) {
            /* Si dependencies es null, quiere decir que existe id, por lo tanto chequear si es necesario inyectar {require, exports, module} */
            var m = $Modules.fetch(id);
            if (m != null) {
                var factory = m.getFactory();
                if (factory != null && isFunction(factory) && factory.length && factory.toString().match(REGEX_CJS) ) {
                    dependencies = COMMONJS_DEPS.slice();
                    factory = factory.toString().replace(REGEX_COMMENTS, "");
                    factory.replace(REGEX_DEPS, function(matches, g1_depName){
                       dependencies.push(g1_depName);
                    });
                }
            }
        }

        /* Si dependencies es null y id es null, retornar con success (si existe) */
        if (dependencies == null || dependencies.length == 0) {
            if (success != null) {
                return success.call(global, []);
            }
            return;
        }
        var currentID = id;
        var count = dependencies.length;
        var uid = ++index;
        var eventName = 'deps-' + uid + (currentID != null ? "-"+currentID : "");
        var orderedDeps = dependencies;

        /* Listen for loaded modules and call success when module has all dependencies resolved. */
        $Events.listen(eventName, function (m) {
            count--;
            if (count == 0 && success != null) {
                var modules = [];
                for ( var i in orderedDeps) {
                    modules.push($Modules.fetch(orderedDeps[i]));
                }
                success.call(global, modules);
            }
        });
        
        for (var i=0; i < dependencies.length; i++) {
            var parent = id || ROOT_CONTEXT;
            /* The parent module is the module 'id' or 'config.baseUrl' */
            var parentModule = id != ROOT_CONTEXT ? id : ROOT_CONTEXT//config.baseUrl;

            /* Obtener MID (Module Id Data) de la dependencia, con información acerca del ID del modulo. */
            var MID = $normalize(dependencies[i], parentModule, config);

            /* Actualizar el ID de la dependencia ( ./module => path/to/some/module) */
            var depID = dependencies[i] = MID.absolute;

            var module = null;
            /* Si el modulo existe (ya está cargado o siendo cargado) utilizar dicha referencia. */
            if ($Modules.exists(depID)) {
                module = $Modules.fetch(depID);
            } else {
                /* Sino crear un modulo nuevo. */
                module = $Modules.create(depID);
                if (config.shim[depID] != null) {
                    module.isShim(true);
                }
            }

            if (module.isReady()) {
                $Events.broadcast(eventName, module.getID());
            } else if ((!module.isReady() && module.loaded())           // Module is loaded but not ready (needs resolve dependencies)
                        || (!module.isReady() && module.isDefined())) {     // Module is no ready but is defined (was defined but never required)

                $resolve(module.getDependencies(), config, function () {
                    $Events.broadcast(eventName, module.getID());
                }, module.getID());
            } else if ($AmlContext.isLoading(module.getID())) {
                var did = depID.concat();
                var eName = eventName.concat();

                $Events.listen("aml-finished-" + did, function (id) {
                    var m = $Modules.fetch(id);
                    $resolve(m.getDependencies(), config, function () {
                        $Events.broadcast(eName, id);
                    }, did)
                });
            } else if ($needsPlugin(module.getID())) {
                /* If the module needs a plugin to run, load it and delegate module loading. */
                var k = i;
                var data = $getPluginData(depID);
                var r = $normalizePlugin(data.resource, parentModule, true, config);
                var requiredBy = id != ROOT_CONTEXT ? 'aml-' + id : ROOT_CONTEXT;

                dependencies[i] = depID = data.plugin + "!" + r;
                module.setID(depID);
                $loadWithPlugin(module.getID(), module, config, function() {
                    $Events.broadcast(eventName, module.getID());
                }, requiredBy)
            } else {
                /* Default action at this point must be a require (who calls '$resolve') */
                var action = $AmlContext.getCurrentAction() || 'require';
                /* Finally, need to load the module from its source file. */
                module.setAsLoading();
                
                if (module.isShim()) {
                    /* Set module as loading and retrieve shim data. */
                    var shimdata = config.shim[module.getID()];
                    if (isObject(shimdata)) {
                        /* Crear el nuevo modulo sin factory, pero con las dependencias as resolver */
                        module.setDependencies((shimdata.deps || []).slice());
                    } else if (isArray(shimdata)) {
                        /* Crear el nuevo modulo sin factory, pero con las dependencias as resolver */
                        module.setDependencies((shimdata || []).slice());
                    }
                }

                /* The third parameter is a callback. Currently, is not necessary its implementation */
                $resolve(module.getDependencies(), config, null, module.getID())

                /* Create filename from MID. */
                var filename = $filename(MID, config, '.js');
                var bundle = {
                    'data-action' : action,
                    'data-required-by' : parent,
                    'data-event' : eventName
                };

                $load(module.getID(), filename, config, $onload, bundle);
            }
        }
    }

    $load = function (id, fileuri, config, callback, bundle){
        /* Crear un nuevo tag */
        var tag = document.createElement('script');
        $head.appendChild(tag);
        /* Agregar todos los datos necesarios del módulo como atributos del tag */
        tag.setAttribute('data-module', id);
        if (bundle != null) {
            for (var data in bundle) {
                tag.setAttribute(data, bundle[data]);
            }
        }
        tag.type = 'text/javascript';
        
        /* Si se importa el script correctamente, llamar al callback
         * y remover el recurso como recurso externo cargandose en el contexto. */
        var onload = function (evt) {
            var modID = (evt.srcElement || evt.target).getAttribute('data-module');
            $Events.broadcast('aml-module-loaded', [modID]);
            $Events.remove('aml-module-loaded');
            callback.call(global, evt, config);
            $AmlContext.loaded(modID);
        }
        /* Si se produce un error al cargar el script, arrojar un error. */
        var onerror = function (evt) {
            var modID = (evt.srcElement || evt.target).getAttribute('data-module');
            $AmlContext.loaded(modID);
            $Events.remove('aml-module-loaded');
            throw new Error("Error loading module " + modID + " from file " + fileuri);
        }
        
        if (isIE) {
            var ieonload = function(evt) {
                if ( tag.readyState === 'loaded' || tag.readyState === "complete" ) {
                    onload.call(global, evt);
                    tag.onreadystatechange = null;
                    tag.detachEvent('onreadystatechange', ieonload);
                    tag.detachEvent('onerror', onerror);
                }
            };
            tag.attachEvent('onreadystatechange', ieonload);
            tag.attachEvent('onerror', onerror);
        } else {
            tag.addEventListener('load', onload, true);
            tag.addEventListener('error', onerror, true);
        }
        
        /* Proceder a la carga del script */
        $AmlContext.loading(id);
        tag.src = fileuri;
    }

    /* Incluir la dependencia {@param dep} desde el archivo {@param filename}. */
    $onload = function (evt, config){
        var target = evt.srcElement || evt.currentTarget;
        
        /* target es el elemento HTML. Cualquier informacion necesario se debería
         * sacar desde el elemento. */
        var moduleID   = target.getAttribute('data-module');
        var eventName  = target.getAttribute('data-event');
        var dependency = $shimModule(
                            $Modules.exists(moduleID) ? $Modules.fetch(moduleID) : $Modules.new(moduleID, [], {}), 
                            config
                        );
        dependency.loadingDone();

        /* Load finished (maybe module is not ready) */
        $Events.broadcast("aml-finished-" + moduleID, moduleID);
        $resolve(dependency.getDependencies(), config, function() {
            /* Module is ready. */
            $Events.broadcast(eventName, moduleID);
        }, dependency.getID());
    };

    $shimModule = function (dependency, config) {
        if (config.shim == null || config.shim[dependency.getID()] == null)
            return dependency;
        var shimdata = config.shim[dependency.getID()];
        if (isObject(shimdata)) {
            /* Crear el nuevo modulo sin factory, pero con las dependencias as resolver */
            dependency.setDependencies((shimdata.deps || null));
            var factory = null;
            var _exports = shimdata.exports ||null;
            var init = shimdata.init || null;
            if (_exports != null && init != null) {
                factory = function () {
                    var result = init.apply(global, arguments);
                    if (result == undefined) {
                        var nesteds = _exports.split('.');
                        var target = null;
                        if (nesteds.length > 1) {
                            target = global;
                            for (var i in nesteds) {
                                var prop = nesteds[i];
                                target = target[prop];
                            }
                        } else {
                            target = global[_exports];
                        }
                        result = target;
                    }
                    return result;
                }
            } else if (init != null) {
                factory = function () {
                    var result = init.apply(global, arguments);
                    return result;
                }
            } else if (_exports != null) {
                factory = function () {
                    var nesteds = _exports.split('.');
                    var target = null;
                    if (nesteds.length > 1) {
                        target = global;
                        for (var i in nesteds) {
                            var prop = nesteds[i];
                            target = target[prop];
                        }
                    } else {
                        target = global[_exports];
                    }
                    return target;
                }
            }
            dependency.setFactory(factory);
        } else if (isArray(shimdata)) {
            /* Crear el nuevo modulo sin factory, pero con las dependencias as resolver */
            dependency.setDependencies((shimdata || null));
        }
        dependency.isShim(true);
        return dependency;
    }

    $normalizePlugin = function (resource, path, absolute, config) {
        if (absolute == undefined)
            absolute = false;
        var result = resource;
        var regex = /[0-9]+\?(.*?:.*)+/
        if (resource.match(regex) != null) {
            var parts = resource.split('?');
            var array = null;
            var index = parts.shift();
            array = parts.pop().split(':');
            for (var i in array) {
                array[i] = $normalize(array[i], path, config).absolute;
            }
            result = index + "?" + array.join(':');
        } else if (absolute) {
            result = $normalize(resource, path, config).absolute;
        }
        return result;
    }

    $loadWithPlugin = function (depID, module, config, callback, requiredBy) {
        var data, plugin, resource;

        data = $getPluginData(depID);
        plugin = data.plugin;
        resource = data.resource;

        if (data.plugin == null || data.resource == null)
            throw new Error("Invalid [Plugin ID]![Module ID] {" + depID + "}.");

        var r = new $require(buildPath(requiredBy), requiredBy);

        r([
            plugin, 
            'require'
        ], function(plugin, req){
            var resourceAbsoluteId = $normalizePlugin(resource, requiredBy, true, config);
            var onload = function(result) {

                var module = $Modules.new(data.plugin + "!" + resourceAbsoluteId, [], function(){
                    return result;
                });

                callback.call(result);
            };

            onload.fromText = function (name, text) {
                /* TODO: Sanitization */
                eval(text);
            }

            if (plugin.load) {
                var result = plugin.load(
                    resourceAbsoluteId,
                    req,
                    onload,
                    config
                );

                if (result != null)
                    onload.call(null, result);
            }
        });
    }

    /**
     * Convierte un ID relativo a un ID absoluto, basandose en la existencia de current ('.') o parent ('..') folders.
     * Para reemplazar un path por otro configrado en config.paths se utiliza $filename
     */
    $normalize = function (relativeId, parentModule, config) {
        var relative = relativeId.concat();
        var absolute = relativeId.concat();
        var isRelative = false;
        var basePath = null;
        
        /* Check if parentModule is a package ID and retrieve the exact location of parent module. */
        if (parentModule != ROOT_CONTEXT) {
            if (config.packages != null) {
                var path = buildPath(parentModule);
                for (var i in config.packages) {
                    var pack = config.packages[i];
                    if (pack.name == parentModule) {
                        var location = pack.location ? pack.location : pack.name;
                        var main = pack.main ? pack.main : "main";
                        parentModule = location + "/" + main;
                        break;
                    } else if (pack.name == path) {
                        var location = pack.location ? pack.location : pack.name;
                        var name = parentModule.split('/').pop();
                        parentModule = location + "/" + name;
                        break;
                    }
                }
            }
        }

        var moduleBasePath = parentModule;
        /* Si la dependencia empieza con '.' o '..' necesita resolverse el path 'top-level'. */
        if (absolute[0] == '.') {
            isRelative = true;
            //var moduleBasePath = buildPath(parentModule);
            //var modulePath = moduleBasePath || ($AmlContext.whoIsRunning() != null && $Modules.existsDeferred($AmlContext.whoIsRunning()) || $Modules.exists($AmlContext.whoIsRunning()) ? $Modules.fetch($AmlContext.whoIsRunning()).getPath() : null);
            var modulePath = buildPath(moduleBasePath);
            /* basePath es el ID del modulo que requiere la dependencia (o el config.baseUrl si el modulo no tiene ID (script tag)) */
            basePath = modulePath != null ? modulePath : config.baseUrl;
            var basePaths = basePath != '/' ? basePath.split('/') : [];
            
            /* Si la dependencia empieza con './' simplemente remover esa parte de basePaths */
            if (absolute[1] != '.') {
                /* substr(2) quita el './' del ID de la dependencia. */
                basePaths.push(absolute.substr(2));
                absolute = basePaths.join("/").replace(/(\/\/)/g, '\/');
            } else {
                /* Si empieza con '../' necesitamos resolver el top-level ID para el modulo
                 * a pesar de que el 'src' del tag script funciona perfecto con 'parent path',
                 * es necesario obtener el ID */
                var depPaths = absolute.split('/');
                while (depPaths[0] == '..') {
                    /* Remove basePath parts until 'depPaths' doesn't have parts to remove, then add '..' in the basePaths */
                    if (basePaths.length > 0 && basePaths.indexOf('..') == -1) {
                        basePaths.pop();
                    } else {
                        basePaths.push('..');
                    }
                    depPaths.shift();
                }
                if (basePaths.length > 0) {
                    absolute = (config.baseUrl != '/' ? config.baseUrl :'') + "/" + basePaths.join("/") + "/" + depPaths.join("/");
                } else {
                    absolute = depPaths.join("/");
                }
            }
        } else {
            /* Es MID, no dependencias, por lo que parentModule NO tiene nada que hacer acá. */
            if (absolute.indexOf('/') > 0) {
                var path = absolute.split('/');
                path.pop();
                basePath = config.baseUrl + path.join("/");
            } else {
                basePath = config.baseUrl;
            }
        }

        var remap = absolute.concat();
        if (config.map != null && config.map[moduleBasePath]) {
            if (config.map[moduleBasePath][remap] != null) {
                remap = config.map[moduleBasePath][remap];
            } else {
                var parts = remap.split('/');
                var result = [];
                var test = [], tmp = null;
                while ((tmp = parts.shift()) != null) {
                    test.push(tmp);
                    if (config.map[moduleBasePath][test.join('/')] != null) {
                        result.push(config.map[moduleBasePath][test.join('/')]);
                    } else {
                        result = result.concat([tmp]).concat(parts);
                        break;
                    }
                }
                remap = result != null ? result.join('/') : remap;
            }
        } else if (config.map != null && config.map['*']) {
            if (config.map['*'][remap] != null) {
                remap = config.map['*'][remap];
            } else {
                var parts = remap.split('/');
                var result = [];
                var test = [], tmp = null;
                while ((tmp = parts.shift()) != null) {
                    test.push(tmp);
                    if (config.map['*'][test.join('/')] != null) {
                        result.push(config.map['*'][test.join('/')]);
                    } else {
                        result = result.concat([tmp]).concat(parts);
                        break;
                    }
                }
                remap = result != null ? result.join('/') : remap;
            }
        }

        absolute = remap;
        var res = {
            relative : relative,
            absolute : absolute,
            isRelative : isRelative,
            basePath : basePath
        };
        return res;
    }

    /**
     * Obtiene el filename para un ID absoluto.
     */
    $filename = function (uri, config, ext) {
        /* Si se usa path, utilizar el uri relativo, no el absoluto */
        //var id = uri.isRelative && config.paths[uri.baseUrl] ? uri.relative : uri.absolute;
        var id = uri.absolute;
        if (config.paths != null && config.paths[id] != null) {
            id = config.paths[id];
        }
        /* Nombre por defecto*/
        var filename = id;
        var parts = id.split('/');
        var result = [];
        var test = [], tmp = null;
        while ((tmp = parts.shift()) != null) {
            test.push(tmp);
            if (config.paths[test.join('/')] != null) {
                result.push(config.paths[test.join('/')]);
            } else {
                result = result.concat([tmp]).concat(parts);
                break;
            }
        }
        filename = result != null ? result.join('/') : filename;
        if (config.packages != null) {
            var path = buildPath(filename);
            for (var i in config.packages) {
                var pack = config.packages[i];
                if (pack.name == filename) {
                    var location = pack.location ? pack.location : pack.name;
                    var main = pack.main ? pack.main : "main";
                    filename = location + "/" + main;
                    break;
                } else if (pack.name == path) {
                    var location = pack.location ? pack.location : pack.name;
                    var name = filename.split('/').pop();
                    filename = location + "/" + name;
                    break;
                }
            }
        }

        if (filename.indexOf('/') != 0 && filename.indexOf('http://') == -1 && filename.indexOf('https://') == -1) {
            filename += (ext != null && filename.indexOf(ext) == -1 ? ext : "");
        }

        if (config.paths != null) {
            for (var path in config.paths) {
                if (filename.indexOf(path) == 0)
                    filename.replace(path, config.paths[i]);
            }
        }

        if (config.baseUrl != '/' && 
                filename.indexOf('http://') != 0 && 
                filename.indexOf('https://') != 0 && 
                filename.indexOf(config.baseUrl + "/..") != 0 &&
                filename.indexOf(config.baseUrl) != 0
        ) {
            if (config.baseUrl[config.baseUrl.length-1] != '/')
                config.baseUrl += '/';
            filename = config.baseUrl + filename;
        }
        return filename;
    }

    $needsPlugin = function (id) {
        return id.indexOf('!') > 0; /* Plugin name has at least 1 letter in its name */
    }

    $getPluginData = function(id) {
        var parts = id.split('!');
        var data = {
            plugin : parts[0],
            resource : parts[1]
        }
        return data;
    } 
    
    $require = function (path, parent, callback) {
        var require = function (id, deps, def) {
            $AmlContext.setCurrentAction('require');
            var config = getConfig();
            var args = $mapArgs(id, deps, def);
            
            if (args.id != null && (args.dependencies == null || args.dependencies.length == 0) && args.factory == null) {
                if ($needsPlugin(args.id)) {
                    var data = $getPluginData(args.id);
                    
                    data.plugin = $normalize(data.plugin, parent, config).absolute;
                    data.resource = $normalizePlugin(data.resource, parent, false, config);

                    var plugin = $Modules.fetch(data.plugin);
                    if (plugin.isReady() && plugin.run().dynamic != null && plugin.run().dynamic) {
                        throw new Error("Module {"+data.resource+"} needs the {"+data.plugin+"} plugin to load. In order to use this resource, use require(['" +data.plugin+ "!"+data.resource+"'],...) due to dynamic nature of the plugin.");
                    } else {
                        return $Modules.fetch(data.plugin + "!" + data.resource).run();
                    }

                } else {
                    var resource = $normalize(args.id, $require.path, config).absolute;
                    var module = $Modules.fetch(resource);
                    if (module != null && module.isReady()) {
                        return module.run();
                    } else {
                        var cause = module != null ? "ready" : "defined";
                        if ($aml.strict)
                            throw new Error("Module {"+resource+"} is not " + cause + ". In order to use this module, use define('"+resource+"',...)");
                        throw new Error("Module {"+resource+"} is not " + cause + ". Try using the callback version: require(['"+resource+"'], function ("+resource+"){/* Here "+resource+" is defined.*/})");
                    }
                }
            } else if (args.id != null) {
                throw new Error("Invalid call. Maybe you meant require(['"+args.id+"'], function ("+args.id+"){/* Here "+args.id+" is defined.*/})");
            } else {
                config = extend(config, args.config);
                var dependencies = args.dependencies;
                var definition = args.factory;
                $resolve(dependencies, config, function (modules) {
                    if (definition == null)
                        return;
                    definition.apply(global, modules.map(function(m){
                        if (m != null)
                            return m.run();
                        else
                            throw new Error("Module is not ready");
                    }));
                    if (callback)
                        callback.call(null, args);
                }, parent || ROOT_CONTEXT);
            }
        }

        require.toUrl = toUrl;
        require.path = path;
        return require;
    }

    $mapArgs = function (arg1, arg2, arg3, arg4) {
        /* Si el arg1 (que por lo general es el ID) es nulo, reordenar los demas argumentos. */
        if (arg1 == null) {
            if (arg2 != null) {
                arg1 = arg2; // Dependencies
                arg2 = arg3; // Factory
            }else {
                arg1 = arg3; // Factory
            }
        }
        var args = {
            id : null,
            config : {},
            dependencies : null,
            factory : null,
            dynamic : false
        };

        if (isString(arg1)) {
            args.id = arg1;
            if (arg3 != null) {
                args.dependencies = isArray(arg2) ? arg2 : null;
                args.factory = arg3;
                args.dynamic = arg4 != undefined ? arg4 : false;
            } else {
                args.dependencies = isArray(arg2) ? arg2 : null;
                args.factory = arg2;
                args.dynamic = arg3 != undefined ? arg3 : false;
            }
        } else if (isObject(arg1) && arg2 != null) {
            args.config = arg1;
            if (arg3 != null) {
                args.dependencies = isArray(arg2) ? arg2 : null;
                args.factory = arg3;
                args.dynamic = arg4 != undefined ? arg4 : false;
            } else {
                args.dependencies = isArray(arg2) ? arg2 : null;
                args.factory = arg2;
                args.dynamic = arg3 != undefined ? arg3 : false;
            }
        } else if (isArray(arg1)) {
            args.dependencies = arg1;
            args.factory = arg2;
            args.dynamic = arg3 != undefined ? arg3 : false;
        } else  {
            args.factory = arg1;
            args.dynamic = arg2 != undefined ? arg2 : false;
        }
        return args;
    }

    /* Add 'require' module to definitions array */
    $Modules.new('require', [], function() {
        var requiredBy = ROOT_CONTEXT;
        var path = getConfig().baseUrl;
        var trace = $AmlContext.whoIsRunning(true);  // If A factory calls require('B'), remove 'B' from trace and get 'A's path.
        
        trace.pop(); /* Pop require call */
        var caller = trace.pop();
        if (caller != null && caller != ROOT_CONTEXT) {
            var m = $Modules.fetch(caller)
            requiredBy = m.getID();
            path = m.getPath();
        }
        var r = new $require(path, requiredBy);
        return r;
    });

    $Modules.new('exports', [], function() {
        var name = null;
        var trace = $AmlContext.whoIsRunning(true);
        
        trace.pop(); /* Pop exports call */
        var caller = trace.pop();
        if (caller != null) {
            name = caller;
        }

        if (cjs.module[name] == null) {
            cjs.module[name] = buildcjs(name);
        }
        return cjs.module[name].exports;
    });

    $Modules.new('module', [], function() {
        var name = null;
        var trace = $AmlContext.whoIsRunning(true);
        
        trace.pop(); /* Pop module call */
        var caller = trace.pop();
        if (caller != null) {
            name = caller;
        }

        if (cjs.module[name] == null) {
            cjs.module[name] = buildcjs(name);
        }
        return cjs.module[name];
    });
    
    /*== START ==*/
    cjs.module = {};

    /* If require is defiend and it's an object, MUST be a configuration object for aml. */
    if (isObject(require)) {
        $config = extend($config, require);
    }

    if ($config.baseUrl) {
        var cDir = $config.baseUrl == './';
        if (!cDir)
            $config.baseUrl = $normalize($config.baseUrl, ROOT_CONTEXT, $config).absolute;
    }
    
    /* Global Require */
    require = aml = function () {
        /* All calls made on require or aml global function se the path to the basePath */
        var r = new $require(getConfig().baseUrl, ROOT_CONTEXT, function (args) {
            $Events.broadcast('data-main-loaded', [args]);
        });
        return r.apply(global, arguments);
    }
    require.config = getConfig;
    require.toUrl = toUrl;

    /* Global define */
    define = function () {
        return $define.apply(global, arguments);
    }
    define.amd = {};

    if ($aml.debug) {
        aml.dump = function (module) {
            $Modules.dump(module);
        };
        aml.modules = $Modules;
        aml.r = $resolve;
        aml.cjs = cjs;
    }
    if ($config.build != null) {
        aml.modules = $Modules;
        aml.resolve = $resolve;
        aml.events = $Events;
        aml.needsPlugin = $needsPlugin;
        aml.getPluginData = $getPluginData;
        aml.normalizePlugin = $normalizePlugin;
        aml.isIE = isIE;
    }

    /* If data-main is defined, start with require */   
    if ($start != null && !$config.build) {
        var main = $start.getAttribute('data-main');
        if (main == null || main.length == 0)
            throw new Error("[data-main] attribute cannot be empty.");
        var fileuri = $config.baseUrl + main + ".js";
        var tag = document.createElement('script');
        tag.type = 'text/javascript';
        tag.async = true;
        $head.appendChild(tag);
        tag.src = fileuri;
    }
})(this);