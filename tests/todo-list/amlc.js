/*
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Leonardo Brugnara
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

'use strict';
(function(global){
    var $amlConfig = aml.config();
    var $buildConfig = {
        isBuild : $amlConfig.build != null,
        /* Wrap shims with define() call and remove shim from config. */
        wrapShim : false,
        /* Build output: none, window-text (with data uri), file (html5 download attr.), console (plain text), console-datauri (data uri link), window-html (IE default)*/
        target : 'file',
        /* Additional modules to include in the build */
        modules : [],
        /* Name for targets: window-* and file */
        output : 'build.js',
        /* Wrap the build with start and end strings. 
         * Allows files with postfix .build like start.build and end.build. */
        wrap : {
            start   : "(function (global) {",
            end     : "})(this);"
        }
    }
    
    if (!$buildConfig.isBuild)
        return;

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
    }

    var isString = function (o) {
        return Object.prototype.toString.call(o) === '[object String]' && typeof o === 'string';
    }

    var isFunction = function (o) {
        return Object.prototype.toString.call(o) === '[object Function]';
    }

    var isArray = function (o) {
        return Object.prototype.toString.call(o) === '[object Array]' && o instanceof Array;
    }

    var htmlencode = function (str) {
        return str.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
           return '&#'+i.charCodeAt(0)+';';
        })
    }
    
    function Http(args){
        var headers = {};
        var defArgs = {
            /* Http method */
            type        : 'GET',
            /* Asynchronous request */
            async       : true,
            /* Request body or query string */
            data        : null,
            /* Http Headers */
            headers     : {
                'Content-Type' : 'application/x-www-form-urlencoded'
            },
            /* text | html,xml | json */
            parseAs     : 'text',
            /* Callbacks: if before returns false, the request will be canceled */
            before      : null,
            /* Callbacks: Whene request is successful */
            success     : null,
            /* Callbacks: Whene request is in progress */
            progress    : null,
            /* Callbacks: Whene request fail */
            error       : null,
            /* Callbacks: Whene request is aborted */
            abort       : null,
        }

        for (var i in defArgs){
            if(args[i] == null)
                args[i] = defArgs[i];
        }

        var http = null;
        if (window.XMLHttpRequest) {
             http = new XMLHttpRequest();
        }
        else {
             try {
                http = new ActiveXObject("Msxml2.XMLHTTP");
             } catch (e) {
                http = new ActiveXObject("Microsoft.XMLHTTP");
             }
        }
        http.setRequestHeader = function(header, value) {
            headers[header] = value;
            /* Content-Type multipart/form-data and boundary are defined by the browser. */
            if (header.toLowerCase() == "content-type" && value.toLowerCase().indexOf("multipart/form-data") > -1)
                return;
            if (XMLHttpRequest.prototype.setRequestHeader)
                XMLHttpRequest.prototype.setRequestHeader.apply(http, arguments);
        }

        http.getRequestHeader = function(header) {
            return headers[header];
        }
        
        // progress on transfers from the server to the client (downloads)
        function onprogress (evt) {
          if (args.progress)
            args.progress(evt.loaded / evt.total, evt);
        }

        function onload(evt) {
            if (args.success){
                var response = http.response || http.responseText;
                switch (args.parseAs) {
                    case 'xml':
                        var p = new DOMParser();
                        response = p.parseFromString(response, 'text/xml');
                        break;
                    case 'html':
                        var p = new DOMParser();
                        response = p.parseFromString(response,  (aml.isIE ? 'application/xhtml+xml' : 'text/html'));
                        break;
                    case 'json':
                        response = JSON.parse(response);
                        break;
                }
                args.success(response, http);
            }
        }

        function onerror(evt) {
            if (args.error)
                args.error(evt);
        }

        function onabort(evt) {
            if (args.abort)
                args.abort(evt);
        }

        if (aml.isIE) {
            http.onreadystatechange = function(evt) { //Call a function when the state changes.
                if (http.readyState == 4 && http.status == 200) {
                    onload.call(null, http);
                } else if (http.readyState == 4 && http.status != 200) {
                    onerror.call(null, http);
                } else {
                    onprogress.call(null, evt);
                }
           }
        } else {
            http.addEventListener("progress",   onprogress, false);
            http.addEventListener("load",       onload,     false);
            http.addEventListener("error",      onerror,    false);
            http.addEventListener("abort",      onabort,    false);
        }
        var doRequest = true;
        if (args.before != null && !args.before())
            return;

        http.open(args.type, args.url, args.async);
        for(var i in args.headers){
            http.setRequestHeader(i, args.headers[i]);
        }

        if (args.overrideMimeType)
            http.overrideMimeType = args.overrideMimeType;
        var data = args.data;
        http.send(data);
    }

    var $http = function (args) {
        new Http(args);
    };


    $buildConfig = extend($buildConfig, $amlConfig.build);

    aml.events.listen('data-main-loaded', function (args) {
        var unresolvedModules = ($amlConfig.build.modules || []).concat(aml.modules.all().filter(function (m) {
            return !m.isReady();
        }).map(function (m) {
            return m.getID();
        }));
        aml.resolve(unresolvedModules, $amlConfig, function () {
            $buildProject(args);
        })
    });
    
    /* Write module definition as source code. */
    var $compileModule = function (id, dependencies, factory, type) {
        if (type == null)
            type = "define";

        var module = id != null ? aml.modules.fetch(id) : null;
        var output = "";
        var define = type + "(" + (id != null ? "'" + id + "'" : "") + "";
        var body = "";
        
        if (id != null)
            body += ", ";

        body += dependencies != null ? "[" + dependencies.toString() + "]" : "";
        
        if (dependencies != null)
            body +=", ";

        if (isFunction(factory)) {
            body += factory + ")";
        } else if (isString(factory)) {
            if ($buildConfig.wrapShim && module != null && module.isShim()) {
                body += factory + ")";
            } else {
                body += "'" + factory + "')";
            }
        } else {
            body += objToString(factory) + ")";
        }

        output += [
                (id != null ? "/* Module " + id + " */" : "/* Entry point */"),
                define + body + ";",
                "\n"                
        ].join('\n');

        return output;
    }

    /* JS Objects are writed key by key, String adds single quotes and escape single quotes inside value */
    var objToString = function (obj, nested) {
        if (nested == undefined)
            nested = 1;
        var s = "{\n";
        var props = [];
        for (var i in obj) {
            var value = obj[i];
            if (isObject(value)) {
                value = objToString(value, nested+1);
            } else if (isString(value)) {
                value = "'" + value.replace(/'/g, "\\'") + "'";
            }
            var line = "'" + i + "' : " + value;
            var l = nested;
            while(l--)
                line = "\t" + line;
            props.push(line);
        }
        s += props.join(',\n');
        s += "\n";
        var l = nested-1;
        var end = "}";
        while(l--) {
            end = "\t" + end;
        }
        s += end;
        return s;
    }

    /* Creates the header section for build file */
    var $compileSectionStart = function () {
        var start = $buildConfig.wrap.start;
        if (start.match(/.build$/g)) {
            $http({
                url: start,
                async: false,
                success: function (startBuild) {
                    start = startBuild;
                }
            })
        }

        if (!$amlConfig.build.includeConfig)
            return start + "\n";

        var configObj = {};
        for (var i in $amlConfig) {
            if (i == 'build')
                continue;
            configObj[i] = $amlConfig[i];
        }
        var config = configObj != null ? objToString(configObj, 2) : null;
        if (config != null)
            start += "\n\trequire.config(" + config + ");";
        start += "\n";
        return start;
    }

    /* Creates the footer section for build file */
    var $compileSectionEnd = function () {
        var end = $buildConfig.wrap.end;
        if (end.match(/.build$/g)) {
            $http({
                url: end,
                async: false,
                success: function (endBuild) {
                    end = startBuild;
                }
            })
        }
        return "\n" + end;
    }

    var $prepareModule = function (id) {
        var module = aml.modules.fetch(id);
        var dependencies = module.getDependencies();
        var factory = module.getFactory();
        if (id != null && aml.needsPlugin(id)) {
            var data = aml.getPluginData(id);
            var plugin = aml.modules.fetch(data.plugin);
            var pluginDependencies = prepareDependencies(plugin.getDependencies());
            var pluginApi = plugin.run();
            var resource = data.resource;
        } else {
            dependencies = prepareDependencies(dependencies);
        }

        return {
            factory : factory,
            dependencies : dependencies
        }
    }

    var prepareDependencies = function (deps) {
        if (deps == null)
            return deps;
        return deps.map(function(e){
            return "'" + e + "'" ;
        });
    }

    /* Build the entire project. Resolve modules involved in the data-main file, modules explicited by config.build.modules option and
     * map shimed modules with their respective 'exports' or 'init' option. The result is a closure with the project inside it.
     * The result can be visualized in the 'console', a new 'window', downloaded as 'file' or ignored with 'none'. */
    var $buildProject = function (args) {
        if (!$buildConfig.isBuild)
            return null;
        var $output = "";

        aml.events.listen('compiler-ready', function () {
            if ($amlConfig.build.target == 'none')
                return;

            $output += $compileModule(args.id, prepareDependencies(args.dependencies), args.factory, 'require');

            $output = $output.split('\n').map(function (line) {
                return "\t" + line;
            }).join('\n')

            $output = $compileSectionStart() + $output + $compileSectionEnd();
            var title = $amlConfig.build.output || "build.js";
            var link = document.createElement('a');
            var encodedContent = 'data:text/plain;charset=utf-8,' + encodeURIComponent($output);
            var html5DownloadSupport = typeof link.download != undefined;

            if (aml.isIE) {
                var w = window.open('', (new Date()).getTime(), '');
                var d = w.document;
                d.open();
                d.write("<pre>" + htmlencode($output) + "</pre>");
                d.close();
                d.title = title;
            }

            if ($amlConfig.build.target == 'console') {
                console.log($output);
            } else if ($amlConfig.build.target == 'console-datauri') {
                console.log(encodedContent);
            } else if ($amlConfig.build.target == 'file' && html5DownloadSupport) {
                link.setAttribute('download', title);
                link.setAttribute('href', encodedContent);
                link.click();
                link = null;
            } else if ($amlConfig.build.target == 'window-text' || !html5DownloadSupport) {
                var w = window.open(encodedContent, (new Date()).getTime(), '');
                var d = w.document;
                d.title = title;
            } else if ($amlConfig.build.target == 'window-html') {
                var w = window.open('', (new Date()).getTime(), '');
                var d = w.document;
                d.open();
                d.write("<pre>" + htmlencode($output) + "</pre>");
                d.close();
                d.title = title;
            }
        });
        
        var $compiledModules = [];
        var $q = null;
        var $writeModules = function (modules) {
            $q = modules.length;
            aml.events.listen('write-done', function () {
                $q--;
                if ($q == 0)
                    aml.events.broadcast('compiler-ready');
            })
           
            for (var i in modules) {
                var module = modules[i];
                var res = $writeModule(module);
                aml.events.broadcast('write-done');
            }
        }

        var $writeModule = function (module) {
            var isPlugin = module.isPlugin();
            /*if (isPlugin && !module.run().compile) {
                return;
            }*/

            var needsPlugin = aml.needsPlugin(module.getID());
            var pluginData = null;
            var plugin = null;
            if (needsPlugin) {
                pluginData = aml.getPluginData(module.getID());
                plugin = aml.modules.fetch(pluginData.plugin);
                if (!plugin.run().compile) {
                    return;
                }
            }

            var id = module.getID();
            if ($compiledModules.indexOf(id) > -1)
                return;

            var deps = module.getDependencies();
            if (needsPlugin) {
                deps = plugin.getDependencies();
            }
            var parsedModule = $prepareModule(id);
            var dependencies = parsedModule.dependencies;
            var factory = parsedModule.factory;
            var isShim = module.isShim();
            //var result = module.run();

            if (['require', 'exports', 'module'].indexOf(id) == -1) {
                if (isShim) {
                    if (!$buildConfig.wrapShim) {
                        return;
                    }
                    var init = $amlConfig.shim[id]['init'];
                    var _exports = $amlConfig.shim[id]['exports'];
                    factory = _exports || init;
                    dependencies = [];
                    delete $amlConfig.shim[id];
                }
                for (var j=0; deps != null && j < deps.length; j++) {
                    var dep = aml.modules.fetch(deps[j]);
                    $writeModule(dep);
                }
                $output += $compileModule(id, dependencies, factory);
                $compiledModules.push(id);
            }
        }

        /* Sort modules by number of dependencies. This call put modules with most dependencies at the end
         * of modules array. With this sorting, modules with dependencies has these dependencies resolved
         * when module is defined by its factory. */
        var modules = aml.modules.all().sort(function (a,b) {
            var da = a.getDependencies() || [];
            var db = b.getDependencies() || [];
            return da.length - db.length;
        });
        $writeModules(modules);
    }
    /*== DOM Elements ==*/
    var $head = document.getElementsByTagName('head')[0];
    var $start = document.querySelector('script[data-main]');

    if ($start != null) {
        var main = $start.getAttribute('data-main');
        if (main == null || main.length == 0)
            throw new Error("[data-main] attribute cannot be empty.");
        var fileuri = $amlConfig.baseUrl + main + ".js";
        var tag = document.createElement('script');
        tag.type = 'text/javascript';
        tag.async = true;
        $head.appendChild(tag);
        tag.src = fileuri;
    }
})(this);