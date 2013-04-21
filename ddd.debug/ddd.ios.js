/* Zepto v1.0-1-ga3cab6c - polyfill zepto detect event ajax form fx - zeptojs.com/license */


;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+|\s+$/g, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()

var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice, filter = emptyArray.filter,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]*)$/,
    tagSelectorRE = /^[\w-]+$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  function isFunction(value) { return type(value) == "function" }
  function isWindow(obj)     { return obj != null && obj == obj.window }
  function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
  function isObject(obj)     { return type(obj) == "object" }
  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && obj.__proto__ == Object.prototype
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return filter.call(array, function(item){ return item != null }) }
  function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function(node){ if (node.nodeType == 1) return node })
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name, properties) {
    if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'

    var nodes, dom, container = containers[name]
    container.innerHTML = '' + html
    dom = $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function(key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)
        else nodes.attr(key, value)
      })
    }
    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = $.fn
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes. If a plain object is given, duplicate it.
      else if (isObject(selector))
        dom = [isPlainObject(selector) ? $.extend({}, selector) : selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  function extend(target, source, deep) {
    for (key in source)
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key]))
          target[key] = {}
        if (isArray(source[key]) && !isArray(target[key]))
          target[key] = []
        extend(target[key], source[key], deep)
      }
      else if (source[key] !== undefined) target[key] = source[key]
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    var deep, args = slice.call(arguments, 1)
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    args.forEach(function(arg){ extend(target, arg, deep) })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (isDocument(element) && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : [] ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? [] :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  $.contains = function(parent, node) {
    return parent !== node && parent.contains(node)
  }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value){
    var klass = node.className,
        svg   = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    var num
    try {
      return value ?
        value == "true" ||
        ( value == "false" ? false :
          value == "null" ? null :
          !isNaN(num = Number(value)) ? num :
          /^[\[\{]/.test(value) ? $.parseJSON(value) :
          value )
        : value
    } catch(e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function(obj) {
    var name
    for (name in obj) return false
    return true
  }

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.camelCase = camelize
  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0
  $.support = { }
  $.expr = { }

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  $.grep = function(elements, callback){
    return filter.call(elements, callback)
  }

  if (window.JSON) $.parseJSON = JSON.parse

  // Populate the class2type map
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase()
  })

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      emptyArray.every.call(this, function(el, idx){
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function(selector){
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function(selector){
      return this.filter(function(){
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result, $this = this
      if (typeof selector == 'object')
        result = $(selector).filter(function(){
          var node = this
          return emptyArray.some.call($this, function(parent){
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return result
    },
    closest: function(selector, context){
      var node = this[0], collection = false
      if (typeof selector == 'object') collection = $(selector)
      while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
        node = node !== context && !isDocument(node) && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return children(this) }), selector)
    },
    contents: function() {
      return this.map(function() { return slice.call(this.childNodes) })
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return filter.call(children(el.parentNode), function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return $.map(this, function(el){ return el[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(structure){
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom   = $(structure).get(0),
            clone = dom.parentNode || this.length > 1

      return this.each(function(index){
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function(structure){
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function(structure){
      var func = isFunction(structure)
      return this.each(function(index){
        var self = $(this), contents = self.contents(),
            dom  = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return this.map(function(){ return this.cloneNode(true) })
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return this.each(function(){
        var el = $(this)
        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ this.nodeType === 1 && setAttribute(this, name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] && this[0][name]) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? deserializeValue(data) : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this[0] && (this[0].multiple ?
           $(this[0]).find('option').filter(function(o){ return this.selected }).pluck('value') :
           this[0].value)
        ) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(coordinates){
      if (coordinates) return this.each(function(index){
        var $this = $(this),
            coords = funcArg(this, coordinates, index, $this.offset()),
            parentOffset = $this.offsetParent().offset(),
            props = {
              top:  coords.top  - parentOffset.top,
              left: coords.left - parentOffset.left
            }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function(property, value){
      if (arguments.length < 2 && typeof property == 'string')
        return this[0] && (this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function(){ this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      return emptyArray.some.call(this, function(el){
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function(klass){
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function(){
      if (!this.length) return
      return ('scrollTop' in this[0]) ? this[0].scrollTop : this[0].scrollY
    },
    position: function() {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset       = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
      offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

      // Add offsetParent borders
      parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
      parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

      // Subtract the two offsets
      return {
        top:  offset.top  - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function() {
      return this.map(function(){
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, el = this[0],
        Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return isWindow(el) ? el['inner' + Dimension] :
        isDocument(el) ? el.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function(arg) {
            argType = type(arg)
            return argType == "object" || argType == "array" || arg == null ?
              arg : zepto.fragment(arg)
          }),
          parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function(_, target){
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
                 operatorIndex == 1 ? target.firstChild :
                 operatorIndex == 2 ? target :
                 null

        nodes.forEach(function(node){
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          traverseNode(parent.insertBefore(node, target), function(el){
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
               (!el.type || el.type === 'text/javascript') && !el.src)
              window['eval'].call(window, el.innerHTML)
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
      $(html)[operator](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue
  $.zepto = zepto

  return $
})()

window.Zepto = Zepto
'$' in window || (window.$ = Zepto)

;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
      bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
      rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
      playbook = ua.match(/PlayBook/),
      chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
      firefox = ua.match(/Firefox\/([\d.]+)/)

    // Todo: clean this up with a better OS/browser seperation:
    // - discern (more) between multiple browsers on android
    // - decide if kindle fire in silk mode is android or not
    // - Firefox on Android doesn't specify the Android version
    // - possibly devide in os, device and browser hashes

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (bb10) os.bb10 = true, os.version = bb10[2]
    if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2]
    if (playbook) browser.playbook = true
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
    if (chrome) browser.chrome = true, browser.version = chrome[1]
    if (firefox) browser.firefox = true, browser.version = firefox[1]

    os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) || (firefox && ua.match(/Tablet/)))
    os.phone  = !!(!os.tablet && (android || iphone || webos || blackberry || bb10 ||
      (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) || (firefox && ua.match(/Mobile/))))
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)

;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={},
      hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.type(events) != "string") $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (handler.e == 'focus' || handler.e == 'blur') ||
      !!captureSetting
  }

  function realEvent(type) {
    return hover[type] || type
  }

  function add(element, events, fn, selector, getDelegate, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var handler   = parse(event)
      handler.fn    = fn
      handler.sel   = selector
      // emulate mouseenter, mouseleave
      if (handler.e in hover) fn = function(e){
        var related = e.relatedTarget
        if (!related || (related !== this && !$.contains(this, related)))
          return handler.fn.apply(this, arguments)
      }
      handler.del   = getDelegate && getDelegate(fn, event)
      var callback  = handler.del || fn
      handler.proxy = function (e) {
        var result = callback.apply(element, [e].concat(e.data))
        if (result === false) e.preventDefault(), e.stopPropagation()
        return result
      }
      handler.i = set.length
      set.push(handler)
      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      ignoreProperties = /^([A-Z]|layer[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var key, proxy = { originalEvent: event }
    for (key in event)
      if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      })
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.bind(event, selector || callback) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.unbind(event, selector || callback) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string' || $.isPlainObject(event)) event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback) {
      return callback ?
        this.bind(event, callback) :
        this.trigger(event)
    }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else this.each(function(){
        try { this[name]() }
        catch(e) {}
      })
      return this
    }
  })

  $.Event = function(type, props) {
    if (typeof type != 'string') props = type, type = props.type
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    event.isDefaultPrevented = function(){ return this.defaultPrevented }
    return event
  }

})(Zepto)

;(function($){
  var jsonpID = 0,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    if (!('type' in options)) return $.ajax(options)

    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      cleanup = function() {
        clearTimeout(abortTimeout)
        $(script).remove()
        delete window[callbackName]
      },
      abort = function(type){
        cleanup()
        // In case of manual abort or timeout, keep an empty function as callback
        // so that the SCRIPT tag that eventually loads won't result in an error.
        if (!type || type == 'timeout') window[callbackName] = empty
        ajaxError(null, type || 'abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return false
    }

    window[callbackName] = function(data){
      cleanup()
      ajaxSuccess(data, xhr, options)
    }

    script.onerror = function() { abort('error') }

    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true,
  }

  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) != "string")
      options.data = $.param(options.data, options.traditional)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)
    if (settings.cache === false) settings.url = appendQuery(settings.url, '_=' + Date.now())

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = settings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty;
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            // http://perfectionkills.com/global-eval-what-are-the-options/
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, xhr.status ? 'error' : 'abort', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // handle optional data/success arguments
  function parseArguments(url, data, success, dataType) {
    var hasData = !$.isFunction(data)
    return {
      url:      url,
      data:     hasData  ? data : undefined,
      success:  !hasData ? data : $.isFunction(success) ? success : undefined,
      dataType: hasData  ? dataType || success : success
    }
  }

  $.get = function(url, data, success, dataType){
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function(url, data, success, dataType){
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function(url, data, success){
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function(url, data, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function(response){
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var type, array = $.isArray(obj)
    $.each(obj, function(key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)

;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)

;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    transform,
    transitionProperty, transitionDuration, transitionTiming,
    animationName, animationDuration, animationTiming,
    cssReset = {}

  function dasherize(str) { return downcase(str.replace(/([a-z])([A-Z])/, '$1-$2')) }
  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  transform = prefix + 'transform'
  cssReset[transitionProperty = prefix + 'transition-property'] =
  cssReset[transitionDuration = prefix + 'transition-duration'] =
  cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
  cssReset[animationName      = prefix + 'animation-name'] =
  cssReset[animationDuration  = prefix + 'animation-duration'] =
  cssReset[animationTiming    = prefix + 'animation-timing-function'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    speeds: { _default: 400, fast: 200, slow: 600 },
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isPlainObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = (typeof duration == 'number' ? duration :
                    ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var key, cssValues = {}, cssProperties, transforms = '',
        that = this, wrappedCallback, endEvent = $.fx.transitionEnd

    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssValues[animationName] = properties
      cssValues[animationDuration] = duration + 's'
      cssValues[animationTiming] = (ease || 'linear')
      endEvent = $.fx.animationEnd
    } else {
      cssProperties = []
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
        else cssValues[key] = properties[key], cssProperties.push(dasherize(key))

      if (transforms) cssValues[transform] = transforms, cssProperties.push(transform)
      if (duration > 0 && typeof properties === 'object') {
        cssValues[transitionProperty] = cssProperties.join(', ')
        cssValues[transitionDuration] = duration + 's'
        cssValues[transitionTiming] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, wrappedCallback)
      }
      $(this).css(cssReset)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    // trigger page reflow so new elements can animate
    this.size() && this.get(0).clientLeft

    this.css(cssValues)

    if (duration <= 0) setTimeout(function() {
      that.each(function(){ wrappedCallback.call(this) })
    }, 0)

    return this
  }

  testEl = null
})(Zepto)
;/*!
 * ruto.js, yet another simple hash router
 *
 * Copyright 2012, Lim Chee Aun (http://cheeaun.com/)
 * Licensed under the MIT license.
 * http://cheeaun.mit-license.org/
 */

(function(w){
	var routes = [],
		noop = function(){},
		options = {
			defaultPath: '/',
			before: noop,
			on: noop,
			notfound: noop
		};

	var ruto = {
		current: null,
		previous: null,
		config: function(opts){
			for (var o in opts){
				if (opts.hasOwnProperty(o)) options[o] = opts[o];
			}
			return ruto;
		},
		add: function(path, name, fn){
			if (path && name){
				if (typeof name == 'function'){
					fn = name;
					name = null;
				}
				routes.push({
					path: path,
					name: name,
					fn: fn || function(){}
				});
			}
			return ruto;
		},
		go: function(path){
			location.hash = path;
			return ruto;
		},
		back: function(path){
			// Only 1-step back
			if (ruto.previous){
				history.back();
				ruto.previous = null;
			} else if (path){ // Fallback if can't go back
				location.hash = path;
			}
			return ruto;
		}
	};

	var hashchange = function(){
		var hash = location.hash.slice(1),
			found = false,
			current = ruto.current;

		if (!hash) hash = options.defaultPath;

		if (current && current != ruto.previous){
			ruto.previous = current;
		}
		ruto.current = hash;

		for (var i=0, l=routes.length; i<l && !found; i++){
			var route = routes[i],
				path = route.path,
				name = route.name,
				fn = route.fn;
			if (typeof path == 'string'){
				if (path.toLowerCase() == hash.toLowerCase()){
					options.before.call(ruto, path, name);
					fn.call(ruto);
					options.on.call(ruto, path, name);
					found = true;
				}
			} else { // regexp
				var matches = hash.match(path);
				if (matches){
					options.before.call(ruto, path, name, matches);
					fn.apply(ruto, matches);
					options.on.call(ruto, path, name, matches);
					found = true;
				}
			}
		}

		if (!found) options.notfound.call(ruto);

		return ruto;
	};
	ruto.init = function(path){
		w.addEventListener('hashchange', hashchange);
		return hashchange();
	};
	ruto.reload = hashchange;

	w.ruto = ruto;
})(window);;/*!
 * Amplify Store - Persistent Client-Side Storage 1.1.0
 *
 * Copyright 2012 appendTo LLC. (http://appendto.com/team)
 * Dual licensed under the MIT or GPL licenses.
 * http://appendto.com/open-source-licenses
 *
 * http://amplifyjs.com
 */
(function( amplify, undefined ) {

var store = amplify.store = function( key, value, options ) {
	var type = store.type;
	if ( options && options.type && options.type in store.types ) {
		type = options.type;
	}
	return store.types[ type ]( key, value, options || {} );
};

store.types = {};
store.type = null;
store.addType = function( type, storage ) {
	if ( !store.type ) {
		store.type = type;
	}

	store.types[ type ] = storage;
	store[ type ] = function( key, value, options ) {
		options = options || {};
		options.type = type;
		return store( key, value, options );
	};
};
store.error = function() {
	return "amplify.store quota exceeded";
};

var rprefix = /^__amplify__/;
function createFromStorageInterface( storageType, storage ) {
	store.addType( storageType, function( key, value, options ) {
		var storedValue, parsed, i, remove,
			ret = value,
			now = (new Date()).getTime();

		if ( !key ) {
			ret = {};
			remove = [];
			i = 0;
			try {
				// accessing the length property works around a localStorage bug
				// in Firefox 4.0 where the keys don't update cross-page
				// we assign to key just to avoid Closure Compiler from removing
				// the access as "useless code"
				// https://bugzilla.mozilla.org/show_bug.cgi?id=662511
				key = storage.length;

				while ( key = storage.key( i++ ) ) {
					if ( rprefix.test( key ) ) {
						parsed = JSON.parse( storage.getItem( key ) );
						if ( parsed.expires && parsed.expires <= now ) {
							remove.push( key );
						} else {
							ret[ key.replace( rprefix, "" ) ] = parsed.data;
						}
					}
				}
				while ( key = remove.pop() ) {
					storage.removeItem( key );
				}
			} catch ( error ) {}
			return ret;
		}

		// protect against name collisions with direct storage
		key = "__amplify__" + key;

		if ( value === undefined ) {
			storedValue = storage.getItem( key );
			parsed = storedValue ? JSON.parse( storedValue ) : { expires: -1 };
			if ( parsed.expires && parsed.expires <= now ) {
				storage.removeItem( key );
			} else {
				return parsed.data;
			}
		} else {
			if ( value === null ) {
				storage.removeItem( key );
			} else {
				parsed = JSON.stringify({
					data: value,
					expires: options.expires ? now + options.expires : null
				});
				try {
					storage.setItem( key, parsed );
				// quota exceeded
				} catch( error ) {
					// expire old data and try again
					store[ storageType ]();
					try {
						storage.setItem( key, parsed );
					} catch( error ) {
						throw store.error();
					}
				}
			}
		}

		return ret;
	});
}

// localStorage + sessionStorage
// IE 8+, Firefox 3.5+, Safari 4+, Chrome 4+, Opera 10.5+, iPhone 2+, Android 2+
for ( var webStorageType in { localStorage: 1, sessionStorage: 1 } ) {
	// try/catch for file protocol in Firefox and Private Browsing in Safari 5
	try {
		// Safari 5 in Private Browsing mode exposes localStorage
		// but doesn't allow storing data, so we attempt to store and remove an item.
		// This will unfortunately give us a false negative if we're at the limit.
		window[ webStorageType ].setItem( "__amplify__", "x" );
		window[ webStorageType ].removeItem( "__amplify__" );
		createFromStorageInterface( webStorageType, window[ webStorageType ] );
	} catch( e ) {}
}

// globalStorage
// non-standard: Firefox 2+
// https://developer.mozilla.org/en/dom/storage#globalStorage
if ( !store.types.localStorage && window.globalStorage ) {
	// try/catch for file protocol in Firefox
	try {
		createFromStorageInterface( "globalStorage",
			window.globalStorage[ window.location.hostname ] );
		// Firefox 2.0 and 3.0 have sessionStorage and globalStorage
		// make sure we default to globalStorage
		// but don't default to globalStorage in 3.5+ which also has localStorage
		if ( store.type === "sessionStorage" ) {
			store.type = "globalStorage";
		}
	} catch( e ) {}
}

// userData
// non-standard: IE 5+
// http://msdn.microsoft.com/en-us/library/ms531424(v=vs.85).aspx
(function() {
	// IE 9 has quirks in userData that are a huge pain
	// rather than finding a way to detect these quirks
	// we just don't register userData if we have localStorage
	if ( store.types.localStorage ) {
		return;
	}

	// append to html instead of body so we can do this from the head
	var div = document.createElement( "div" ),
		attrKey = "amplify";
	div.style.display = "none";
	document.getElementsByTagName( "head" )[ 0 ].appendChild( div );

	// we can't feature detect userData support
	// so just try and see if it fails
	// surprisingly, even just adding the behavior isn't enough for a failure
	// so we need to load the data as well
	try {
		div.addBehavior( "#default#userdata" );
		div.load( attrKey );
	} catch( e ) {
		div.parentNode.removeChild( div );
		return;
	}

	store.addType( "userData", function( key, value, options ) {
		div.load( attrKey );
		var attr, parsed, prevValue, i, remove,
			ret = value,
			now = (new Date()).getTime();

		if ( !key ) {
			ret = {};
			remove = [];
			i = 0;
			while ( attr = div.XMLDocument.documentElement.attributes[ i++ ] ) {
				parsed = JSON.parse( attr.value );
				if ( parsed.expires && parsed.expires <= now ) {
					remove.push( attr.name );
				} else {
					ret[ attr.name ] = parsed.data;
				}
			}
			while ( key = remove.pop() ) {
				div.removeAttribute( key );
			}
			div.save( attrKey );
			return ret;
		}

		// convert invalid characters to dashes
		// http://www.w3.org/TR/REC-xml/#NT-Name
		// simplified to assume the starting character is valid
		// also removed colon as it is invalid in HTML attribute names
		key = key.replace( /[^\-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g, "-" );
		// adjust invalid starting character to deal with our simplified sanitization
		key = key.replace( /^-/, "_-" );

		if ( value === undefined ) {
			attr = div.getAttribute( key );
			parsed = attr ? JSON.parse( attr ) : { expires: -1 };
			if ( parsed.expires && parsed.expires <= now ) {
				div.removeAttribute( key );
			} else {
				return parsed.data;
			}
		} else {
			if ( value === null ) {
				div.removeAttribute( key );
			} else {
				// we need to get the previous value in case we need to rollback
				prevValue = div.getAttribute( key );
				parsed = JSON.stringify({
					data: value,
					expires: (options.expires ? (now + options.expires) : null)
				});
				div.setAttribute( key, parsed );
			}
		}

		try {
			div.save( attrKey );
		// quota exceeded
		} catch ( error ) {
			// roll the value back to the previous value
			if ( prevValue === null ) {
				div.removeAttribute( key );
			} else {
				div.setAttribute( key, prevValue );
			}

			// expire old data and try again
			store.userData();
			try {
				div.setAttribute( key, parsed );
				div.save( attrKey );
			} catch ( error ) {
				// roll the value back to the previous value
				if ( prevValue === null ) {
					div.removeAttribute( key );
				} else {
					div.setAttribute( key, prevValue );
				}
				throw store.error();
			}
		}
		return ret;
	});
}() );

// in-memory storage
// fallback for all browsers to enable the API even if we can't persist data
(function() {
	var memory = {},
		timeout = {};

	function copy( obj ) {
		return obj === undefined ? undefined : JSON.parse( JSON.stringify( obj ) );
	}

	store.addType( "memory", function( key, value, options ) {
		if ( !key ) {
			return copy( memory );
		}

		if ( value === undefined ) {
			return copy( memory[ key ] );
		}

		if ( timeout[ key ] ) {
			clearTimeout( timeout[ key ] );
			delete timeout[ key ];
		}

		if ( value === null ) {
			delete memory[ key ];
			return null;
		}

		memory[ key ] = value;
		if ( options.expires ) {
			timeout[ key ] = setTimeout(function() {
				delete memory[ key ];
				delete timeout[ key ];
			}, options.expires );
		}

		return value;
	});
}() );

}( this.amplify = this.amplify || {} ) );
;/*
 *  Copyright 2011 Twitter, Inc.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var Hogan = {};

(function (Hogan, useArrayBuffer) {
  Hogan.Template = function (codeObj, text, compiler, options) {
    codeObj = codeObj || {};
    this.r = codeObj.code || this.r;
    this.c = compiler;
    this.options = options || {};
    this.text = text || '';
    this.partials = codeObj.partials || {};
    this.subs = codeObj.subs || {};
    this.ib();
  }

  Hogan.Template.prototype = {
    // render: replaced by generated code.
    r: function (context, partials, indent) { return ''; },

    // variable escaping
    v: hoganEscape,

    // triple stache
    t: coerceToString,

    render: function render(context, partials, indent) {
      return this.ri([context], partials || {}, indent);
    },

    // render internal -- a hook for overrides that catches partials too
    ri: function (context, partials, indent) {
      return this.r(context, partials, indent);
    },

    // ensurePartial
    ep: function(symbol, partials) {
      var partial = this.partials[symbol];

      // check to see that if we've instantiated this partial before
      var template = partials[partial.name];
      if (partial.instance && partial.base == template) {
        return partial.instance;
      }

      if (typeof template == 'string') {
        if (!this.c) {
          throw new Error("No compiler available.");
        }
        template = this.c.compile(template, this.options);
      }

      if (!template) {
        return null;
      }

      // We use this to check whether the partials dictionary has changed
      this.partials[symbol].base = template;

      if (partial.subs) {
        // Make sure we consider parent template now
        if (this.activeSub === undefined) {
          // Store parent template text in partials.stackText to perform substitutions in child templates correctly
          partials.stackText  = this.text;
        }
         template = createSpecializedPartial(template, partial.subs, partial.partials, partials.stackText || this.text);
       }
      this.partials[symbol].instance = template;
      return template;
    },

    // tries to find a partial in the current scope and render it
    rp: function(symbol, context, partials, indent) {
      var partial = this.ep(symbol, partials);
      if (!partial) {
        return '';
      }

      return partial.ri(context, partials, indent);
    },

    // render a section
    rs: function(context, partials, section) {
      var tail = context[context.length - 1];

      if (!isArray(tail)) {
        section(context, partials, this);
        return;
      }

      for (var i = 0; i < tail.length; i++) {
        context.push(tail[i]);
        section(context, partials, this);
        context.pop();
      }
    },

    // maybe start a section
    s: function(val, ctx, partials, inverted, start, end, tags) {
      var pass;

      if (isArray(val) && val.length === 0) {
        return false;
      }

      if (typeof val == 'function') {
        val = this.ms(val, ctx, partials, inverted, start, end, tags);
      }

      pass = !!val;

      if (!inverted && pass && ctx) {
        ctx.push((typeof val == 'object') ? val : ctx[ctx.length - 1]);
      }

      return pass;
    },

    // find values with dotted names
    d: function(key, ctx, partials, returnFound) {
      var found,
          names = key.split('.'),
          val = this.f(names[0], ctx, partials, returnFound),
          doModelGet = this.options.modelGet,
          cx = null;

      if (key === '.' && isArray(ctx[ctx.length - 2])) {
        val = ctx[ctx.length - 1];
      } else {
        for (var i = 1; i < names.length; i++) {
          found = findInScope(names[i], val, doModelGet);
          if (found != null) {
            cx = val;
            val = found;
          } else {
            val = '';
          }
        }
      }

      if (returnFound && !val) {
        return false;
      }

      if (!returnFound && typeof val == 'function') {
        ctx.push(cx);
        val = this.mv(val, ctx, partials);
        ctx.pop();
      }

      return val;
    },

    // find values with normal names
    f: function(key, ctx, partials, returnFound) {
      var val = false,
          v = null,
          found = false,
          doModelGet = this.options.modelGet;

      for (var i = ctx.length - 1; i >= 0; i--) {
        v = ctx[i];
        val = findInScope(key, v, doModelGet);
        if (val != null) {
          found = true;
          break;
        }
      }

      if (!found) {
        return (returnFound) ? false : "";
      }

      if (!returnFound && typeof val == 'function') {
        val = this.mv(val, ctx, partials);
      }

      return val;
    },

    // higher order templates
    ls: function(func, cx, partials, text, tags) {
      var oldTags = this.options.delimiters;

      this.options.delimiters = tags;
      this.b(this.ct(coerceToString(func.call(cx, text)), cx, partials));
      this.options.delimiters = oldTags;

      return false;
    },

    // compile text
    ct: function(text, cx, partials) {
      if (this.options.disableLambda) {
        throw new Error('Lambda features disabled.');
      }
      return this.c.compile(text, this.options).render(cx, partials);
    },

    // template result buffering
    b: (useArrayBuffer) ? function(s) { this.buf.push(s); } :
                          function(s) { this.buf += s; },

    fl: (useArrayBuffer) ? function() { var r = this.buf.join(''); this.buf = []; return r; } :
                           function() { var r = this.buf; this.buf = ''; return r; },
    // init the buffer
    ib: function () {
      this.buf = (useArrayBuffer) ? [] : '';
    },

    // method replace section
    ms: function(func, ctx, partials, inverted, start, end, tags) {
      var textSource,
          cx = ctx[ctx.length - 1],
          result = func.call(cx);

      if (typeof result == 'function') {
        if (inverted) {
          return true;
        } else {
          textSource = (this.activeSub && this.subsText[this.activeSub]) ? this.subsText[this.activeSub] : this.text;
          return this.ls(result, cx, partials, textSource.substring(start, end), tags);
        }
      }

      return result;
    },

    // method replace variable
    mv: function(func, ctx, partials) {
      var cx = ctx[ctx.length - 1];
      var result = func.call(cx);

      if (typeof result == 'function') {
        return this.ct(coerceToString(result.call(cx)), cx, partials);
      }

      return result;
    },

    sub: function(name, context, partials, indent) {
      var f = this.subs[name];
      if (f) {
        this.activeSub = name;
        f(context, partials, this, indent);
        this.activeSub = false;
      }
    }

  };

  //Find a key in an object
  function findInScope(key, scope, doModelGet) {
    var val, checkVal;

    if (scope && typeof scope == 'object') {

      if (scope[key] != null) {
        val = scope[key];

      // try lookup with get for backbone or similar model data
      } else if (doModelGet && scope.get && typeof scope.get == 'function') {
        val = scope.get(key);
      }
    }

    return val;
  }

  function createSpecializedPartial(instance, subs, partials, childText) {
    function PartialTemplate() {};
    PartialTemplate.prototype = instance;
    function Substitutions() {};
    Substitutions.prototype = instance.subs;
    var key;
    var partial = new PartialTemplate();
    partial.subs = new Substitutions();
    partial.subsText = {};  //hehe. substext.
    partial.ib();

    for (key in subs) {
      partial.subs[key] = subs[key];
      partial.subsText[key] = childText;
    }

    for (key in partials) {
      partial.partials[key] = partials[key];
    }

    return partial;
  }

  var rAmp = /&/g,
      rLt = /</g,
      rGt = />/g,
      rApos = /\'/g,
      rQuot = /\"/g,
      hChars = /[&<>\"\']/;

  function coerceToString(val) {
    return String((val === null || val === undefined) ? '' : val);
  }

  function hoganEscape(str) {
    str = coerceToString(str);
    return hChars.test(str) ?
      str
        .replace(rAmp, '&amp;')
        .replace(rLt, '&lt;')
        .replace(rGt, '&gt;')
        .replace(rApos, '&#39;')
        .replace(rQuot, '&quot;') :
      str;
  }

  var isArray = Array.isArray || function(a) {
    return Object.prototype.toString.call(a) === '[object Array]';
  };

})(typeof exports !== 'undefined' ? exports : Hogan);
;(function(root, factory){
  // Set up Tappable appropriately for the environment.
  if (typeof define === 'function' && define.amd){
    // AMD
    define('tappable', [], function(){
      factory(root, window.document);
      return root.tappable;
    });
  } else {
    // Browser global scope
    factory(root, window.document);
  }
}(this, function(w, d){

  var abs = Math.abs,
    noop = function(){},
    defaults = {
      noScroll: false,
      activeClass: 'tappable-active',
      onTap: noop,
      onStart: noop,
      onMove: noop,
      onMoveOut: noop,
      onMoveIn: noop,
      onEnd: noop,
      onCancel: noop,
      allowClick: false,
      boundMargin: 50,
      noScrollDelay: 0,
      activeClassDelay: 0,
      inactiveClassDelay: 0
    },
    supportTouch = 'ontouchend' in document,
    events = {
      start: supportTouch ? 'touchstart' : 'mousedown',
      move: supportTouch ? 'touchmove' : 'mousemove',
      end: supportTouch ? 'touchend' : 'mouseup'
    },
    getTargetByCoords = function(x, y){
      var el = d.elementFromPoint(x, y);
      if (el.nodeType == 3) el = el.parentNode;
      return el;
    },
    getTarget = function(e){
      var el = e.target;
      if (el) return el;
      var touch = e.targetTouches[0];
      return getTargetByCoords(touch.clientX, touch.clientY);
    },
    clean = function(str){
      return str.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    },
    addClass = function(el, className){
      if (!className) return;
      if (el.classList){
        el.classList.add(className);
        return;
      }
      if (clean(el.className).indexOf(className) > -1) return;
      el.className = clean(el.className + ' ' + className);
    },
    removeClass = function(el, className){
      if (!className) return;
      if (el.classList){
        el.classList.remove(className);
        return;
      }
      el.className = el.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
    },
    matchesSelector = function(node, selector){
      var root = d.documentElement,
        matches = root.matchesSelector || root.mozMatchesSelector || root.webkitMatchesSelector || root.oMatchesSelector || root.msMatchesSelector;
      return matches.call(node, selector);
    },
    closest = function(node, selector){
      var matches = false;
      do {
        matches = matchesSelector(node, selector);
      } while (!matches && (node = node.parentNode) && node.ownerDocument);
      return matches ? node : false;
    };

  w.tappable = function(selector, opts){
    if (typeof opts == 'function') opts = { onTap: opts };
    var options = {};
    for (var key in defaults) options[key] = opts[key] || defaults[key];
    
    var el = options.containerElement || d.body,
      startTarget,
      prevTarget,
      startX,
      startY,
      elBound,
      cancel = false,
      moveOut = false,
      activeClass = options.activeClass,
      activeClassDelay = options.activeClassDelay,
      activeClassTimeout,
      inactiveClassDelay = options.inactiveClassDelay,
      inactiveClassTimeout,
      noScroll = options.noScroll,
      noScrollDelay = options.noScrollDelay,
      noScrollTimeout,
      boundMargin = options.boundMargin;
    
    el.addEventListener(events.start, function(e){
      var target = closest(getTarget(e), selector);
      if (!target) return;
      
      if (activeClassDelay){
        clearTimeout(activeClassTimeout);
        activeClassTimeout = setTimeout(function(){
          addClass(target, activeClass);
        }, activeClassDelay);
      } else {
        addClass(target, activeClass);
      }
      if (inactiveClassDelay && target == prevTarget) clearTimeout(inactiveClassTimeout);
      
      startX = e.clientX;
      startY = e.clientY;
      if (!startX || !startY){
        var touch = e.targetTouches[0];
        startX = touch.clientX;
        startY = touch.clientY;
      }
      startTarget = target;
      cancel = false;
      moveOut = false;
      elBound = noScroll ? target.getBoundingClientRect() : null;
      
      if (noScrollDelay){
        clearTimeout(noScrollTimeout);
        noScroll = false; // set false first, then true after a delay
        noScrollTimeout = setTimeout(function(){
          noScroll = true;
        }, noScrollDelay);
      }
      options.onStart.call(el, e, target);
    }, false);
    
    el.addEventListener(events.move, function(e){
      if (!startTarget) return;
      
      if (noScroll){
        e.preventDefault();
      } else {
        clearTimeout(activeClassTimeout);
      }
      
      var target = e.target,
        x = e.clientX,
        y = e.clientY;
      if (!target || !x || !y){ // The event might have a target but no clientX/Y
        var touch = e.changedTouches[0];
        if (!x) x = touch.clientX;
        if (!y) y = touch.clientY;
        if (!target) target = getTargetByCoords(x, y);
      }
      
      if (noScroll){
        if (x>elBound.left-boundMargin && x<elBound.right+boundMargin && y>elBound.top-boundMargin && y<elBound.bottom+boundMargin){ // within element's boundary
          moveOut = false;
          addClass(startTarget, activeClass);
          options.onMoveIn.call(el, e, target);
        } else {
          moveOut = true;
          removeClass(startTarget, activeClass);
          options.onMoveOut.call(el, e, target);
        }
      } else if (!cancel && Math.abs(y - startY) > 10){
        cancel = true;
        removeClass(startTarget, activeClass);
        options.onCancel.call(target, e);
      }
      
      options.onMove.call(el, e, target);
    }, false);
    
    el.addEventListener(events.end, function(e){
      if (!startTarget) return;
      
      clearTimeout(activeClassTimeout);
      if (inactiveClassDelay){
        if (activeClassDelay && !cancel) addClass(startTarget, activeClass);
        var activeTarget = startTarget;
        inactiveClassTimeout = setTimeout(function(){
          removeClass(activeTarget, activeClass);
        }, inactiveClassDelay);
      } else {
        removeClass(startTarget, activeClass);
      }
      
      options.onEnd.call(el, e, startTarget);
      
      var rightClick = e.which == 3 || e.button == 2;
      if (!cancel && !moveOut && !rightClick){
        options.onTap.call(el, e, startTarget);
      }
      
      prevTarget = startTarget;
      startTarget = null;
      setTimeout(function(){
        startX = startY = null;
      }, 400);
    }, false);
    
    el.addEventListener('touchcancel', function(e){
      if (!startTarget) return;
      removeClass(startTarget, activeClass);
      startTarget = startX = startY = null;
      options.onCancel.call(el, e);
    }, false);
    
    if (!options.allowClick) el.addEventListener('click', function(e){
      var target = closest(e.target, selector);
      if (target){
        e.preventDefault();
      } else if (startX && startY && Math.abs(e.clientX - startX) < 25 && Math.abs(e.clientY - startY) < 25){
        e.stopPropagation();
        e.preventDefault();
      }
    }, false);
  };

}));;/**
 * @author sole / http://soledadpenades.com
 * @author mrdoob / http://mrdoob.com
 * @author Robert Eisele / http://www.xarg.org
 * @author Philippe / http://philippe.elsass.me
 * @author Robert Penner / http://www.robertpenner.com/easing_terms_of_use.html
 * @author Paul Lewis / http://www.aerotwist.com/
 * @author lechecacharro
 * @author Josh Faul / http://jocafa.com/
 * @author egraether / http://egraether.com/
 * @author endel / http://endel.me
 */

var TWEEN = TWEEN || ( function () {

	var _tweens = [];

	return {

		REVISION: '10',

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function ( tween ) {

			_tweens.push( tween );

		},

		remove: function ( tween ) {

			var i = _tweens.indexOf( tween );

			if ( i !== -1 ) {

				_tweens.splice( i, 1 );

			}

		},

		update: function ( time ) {

			if ( _tweens.length === 0 ) return false;

			var i = 0, numTweens = _tweens.length;

			time = time !== undefined ? time : ( window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );

			while ( i < numTweens ) {

				if ( _tweens[ i ].update( time ) ) {

					i ++;

				} else {

					_tweens.splice( i, 1 );

					numTweens --;

				}

			}

			return true;

		}
	};

} )();

TWEEN.Tween = function ( object ) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;

	// Set all starting values present on the target object
	for ( var field in object ) {

		_valuesStart[ field ] = parseFloat(object[field], 10);

	}

	this.to = function ( properties, duration ) {

		if ( duration !== undefined ) {

			_duration = duration;

		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function ( time ) {

		TWEEN.add( this );

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : (window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() );
		_startTime += _delayTime;

		for ( var property in _valuesEnd ) {

			// check if an Array was provided as property value
			if ( _valuesEnd[ property ] instanceof Array ) {

				if ( _valuesEnd[ property ].length === 0 ) {

					continue;

				}

				// create a local copy of the Array with the start value at the front
				_valuesEnd[ property ] = [ _object[ property ] ].concat( _valuesEnd[ property ] );

			}

			_valuesStart[ property ] = _object[ property ];

			if( ( _valuesStart[ property ] instanceof Array ) === false ) {
				_valuesStart[ property ] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[ property ] = _valuesStart[ property ] || 0;

		}

		return this;

	};

	this.stop = function () {

		TWEEN.remove( this );
		return this;

	};

	this.delay = function ( amount ) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function ( times ) {

		_repeat = times;
		return this;

	};

	this.easing = function ( easing ) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function ( interpolation ) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function ( callback ) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function ( callback ) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function ( callback ) {

		_onCompleteCallback = callback;
		return this;

	};

	this.update = function ( time ) {

		if ( time < _startTime ) {

			return true;

		}

		if ( _onStartCallbackFired === false ) {

			if ( _onStartCallback !== null ) {

				_onStartCallback.call( _object );

			}

			_onStartCallbackFired = true;

		}

		var elapsed = ( time - _startTime ) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		var value = _easingFunction( elapsed );

		for ( var property in _valuesEnd ) {

			var start = _valuesStart[ property ] || 0;
			var end = _valuesEnd[ property ];

			if ( end instanceof Array ) {

				_object[ property ] = _interpolationFunction( end, value );

			} else {

				if ( typeof(end) === "string" ) {
					end = start + parseFloat(end, 10);
				}

				_object[ property ] = start + ( end - start ) * value;

			}

		}

		if ( _onUpdateCallback !== null ) {

			_onUpdateCallback.call( _object, value );

		}

		if ( elapsed == 1 ) {

			if ( _repeat > 0 ) {

				if( isFinite( _repeat ) ) {
					_repeat--;
				}

				// reassign starting values, restart by making startTime = now
				for( var property in _valuesStartRepeat ) {

					if ( typeof( _valuesEnd[ property ] ) === "string" ) {
						_valuesStartRepeat[ property ] = _valuesStartRepeat[ property ] + parseFloat(_valuesEnd[ property ], 10);
					}

					_valuesStart[ property ] = _valuesStartRepeat[ property ];

				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if ( _onCompleteCallback !== null ) {

					_onCompleteCallback.call( _object );

				}

				for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i ++ ) {

					_chainedTweens[ i ].start( time );

				}

				return false;

			}

		}

		return true;

	};

};

TWEEN.Easing = {

	Linear: {

		None: function ( k ) {

			return k;

		}

	},

	Quadratic: {

		In: function ( k ) {

			return k * k;

		},

		Out: function ( k ) {

			return k * ( 2 - k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
			return - 0.5 * ( --k * ( k - 2 ) - 1 );

		}

	},

	Cubic: {

		In: function ( k ) {

			return k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k + 2 );

		}

	},

	Quartic: {

		In: function ( k ) {

			return k * k * k * k;

		},

		Out: function ( k ) {

			return 1 - ( --k * k * k * k );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
			return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

		}

	},

	Quintic: {

		In: function ( k ) {

			return k * k * k * k * k;

		},

		Out: function ( k ) {

			return --k * k * k * k * k + 1;

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
			return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

		}

	},

	Sinusoidal: {

		In: function ( k ) {

			return 1 - Math.cos( k * Math.PI / 2 );

		},

		Out: function ( k ) {

			return Math.sin( k * Math.PI / 2 );

		},

		InOut: function ( k ) {

			return 0.5 * ( 1 - Math.cos( Math.PI * k ) );

		}

	},

	Exponential: {

		In: function ( k ) {

			return k === 0 ? 0 : Math.pow( 1024, k - 1 );

		},

		Out: function ( k ) {

			return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );

		},

		InOut: function ( k ) {

			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
			return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

		}

	},

	Circular: {

		In: function ( k ) {

			return 1 - Math.sqrt( 1 - k * k );

		},

		Out: function ( k ) {

			return Math.sqrt( 1 - ( --k * k ) );

		},

		InOut: function ( k ) {

			if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
			return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

		},

		Out: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

		},

		InOut: function ( k ) {

			var s, a = 0.1, p = 0.4;
			if ( k === 0 ) return 0;
			if ( k === 1 ) return 1;
			if ( !a || a < 1 ) { a = 1; s = p / 4; }
			else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
			if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
			return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

		}

	},

	Back: {

		In: function ( k ) {

			var s = 1.70158;
			return k * k * ( ( s + 1 ) * k - s );

		},

		Out: function ( k ) {

			var s = 1.70158;
			return --k * k * ( ( s + 1 ) * k + s ) + 1;

		},

		InOut: function ( k ) {

			var s = 1.70158 * 1.525;
			if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
			return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

		}

	},

	Bounce: {

		In: function ( k ) {

			return 1 - TWEEN.Easing.Bounce.Out( 1 - k );

		},

		Out: function ( k ) {

			if ( k < ( 1 / 2.75 ) ) {

				return 7.5625 * k * k;

			} else if ( k < ( 2 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

			} else if ( k < ( 2.5 / 2.75 ) ) {

				return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

			} else {

				return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

			}

		},

		InOut: function ( k ) {

			if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
			return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

		if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
		if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

		return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );

	},

	Bezier: function ( v, k ) {

		var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

		for ( i = 0; i <= n; i++ ) {
			b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
		}

		return b;

	},

	CatmullRom: function ( v, k ) {

		var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;

		if ( v[ 0 ] === v[ m ] ) {

			if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

			return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );

		} else {

			if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
			if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

			return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );

		}

	},

	Utils: {

		Linear: function ( p0, p1, t ) {

			return ( p1 - p0 ) * t + p0;

		},

		Bernstein: function ( n , i ) {

			var fc = TWEEN.Interpolation.Utils.Factorial;
			return fc( n ) / fc( i ) / fc( n - i );

		},

		Factorial: ( function () {

			var a = [ 1 ];

			return function ( n ) {

				var s = 1, i;
				if ( a[ n ] ) return a[ n ];
				for ( i = n; i > 1; i-- ) s *= i;
				return a[ n ] = s;

			};

		} )(),

		CatmullRom: function ( p0, p1, p2, p3, t ) {

			var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
			return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;

		}

	}

};

;// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());;dddns = typeof dddns === 'undefined' ? {} : dddns;
dddns['lib'] = 1;
;dddns = typeof dddns === 'undefined' ? {} : dddns;
dddns["TF"]=function(t){
	TEMPLATES={
		'add-feed': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<div class=\"header\">    <label for=\"feed\">Feed url</label>    <input id=\"add-feed\" placeholder=\"feed to add\" type=\"text\" autocorrect=\"off\" autocapitalize=\"off\" autofocus=\"autofocus\"></div>");return t.fl(); },partials: {}, subs: {  }}),
		'article': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<div class=\"post-content\">    <header>        <h1>            <a id=\"full_article\" href=\"");t.b(t.v(t.f("link",c,p,0)));t.b("\" target=\"_blank\">");t.b(t.t(t.f("title",c,p,0)));t.b("<br>            </a>        </h1>        <p class=\"metadata\">            <span class=\"inline-block\">");t.b(t.v(t.f("date",c,p,0)));t.b(" ");if(t.s(t.f("author",c,p,1),c,p,0,246,259,"{{ }}")){t.rs(c,p,function(c,p,t){t.b("by ");t.b(t.v(t.f("author",c,p,0)));});c.pop();}t.b(" </span>             <span class=\"inline-block\">");t.b(t.v(t.f("time_ago",c,p,0)));if(t.s(t.f("comments_count",c,p,1),c,p,0,349,391,"{{ }}")){t.rs(c,p,function(c,p,t){t.b(" &middot; ");t.b(t.v(t.f("comments_count",c,p,0)));t.b(" ");t.b(t.v(t.f("i_comment",c,p,0)));});c.pop();}t.b("</span>        </p>    </header>    <section class=\"grouped-tableview\">        ");t.b(t.t(t.f("content",c,p,0)));t.b("    </section></div>");return t.fl(); },partials: {}, subs: {  }}),
		'feed-partial': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");if(t.s(t.f("icon",c,p,1),c,p,0,9,51,"{{ }}")){t.rs(c,p,function(c,p,t){t.b("<img class=\"fav\" src=\"");t.b(t.v(t.f("icon",c,p,0)));t.b(t.v(t.f("id",c,p,0)));t.b(".ico\">");});c.pop();}if(!t.s(t.f("icon",c,p,1),c,p,1,0,0,"")){t.b("<div class=\"number\">");t.b(t.v(t.f("i",c,p,0)));t.b(".</div>");};t.b("<div class=\"feed\">    <b>");t.b(t.t(t.f("title",c,p,0)));t.b("</b>    ");if(t.s(t.f("updated",c,p,1),c,p,0,166,274,"{{ }}")){t.rs(c,p,function(c,p,t){t.b("        <span class=\"metadata\">            <span class=\"inline-block\">");t.b(t.v(t.f("updated",c,p,0)));t.b("</span>         </span>    ");});c.pop();}t.b("</div>");return t.fl(); },partials: {}, subs: {  }}),
		'feeds-load': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");if(t.s(t.f("loading",c,p,1),c,p,0,12,53,"{{ }}")){t.rs(c,p,function(c,p,t){t.b("<div class=\"loader\">Loading&hellip;</div>");});c.pop();}if(t.s(t.f("load_error",c,p,1),c,p,0,80,130,"{{ }}")){t.rs(c,p,function(c,p,t){t.b("<div class=\"load-error\">Couldn't load feeds.</div>");});c.pop();}return t.fl(); },partials: {}, subs: {  }}),
		'feeds': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<li id=\"feed-");t.b(t.v(t.f("id",c,p,0)));t.b("\" data-index=\"");t.b(t.v(t.f("i",c,p,0)));t.b("\" class=\"");t.b(t.v(t.f("type",c,p,0)));t.b("\">    ");if(t.s(t.f("urlid",c,p,1),c,p,0,71,111,"{{ }}")){t.rs(c,p,function(c,p,t){t.b("<a href=\"#/feed/");t.b(t.v(t.f("urlid",c,p,0)));t.b("\" class=\"\">    ");});c.pop();}t.b("    ");if(!t.s(t.f("urlid",c,p,1),c,p,1,0,0,"")){t.b("<a href=\"#/feed/");t.b(t.v(t.f("id",c,p,0)));t.b("\" class=\"\">    ");};t.b(t.rp("<feed_partial0",c,p,""));t.b("</a>");if(t.s(t.f("unread",c,p,1),c,p,0,214,255,"{{ }}")){t.rs(c,p,function(c,p,t){t.b("<span class=\"count\">");t.b(t.v(t.f("unread",c,p,0)));t.b("</span></a>");});c.pop();}t.b("</li>");return t.fl(); },partials: {"<feed_partial0":{name:"feed_partial", partials: {}, subs: {  }}}, subs: {  }}),
		'headline': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<li id=\"article-");t.b(t.v(t.f("id",c,p,0)));t.b("\" data-index=\"");t.b(t.v(t.f("i",c,p,0)));t.b("\" class=\"");t.b(t.v(t.f("type",c,p,0)));t.b("\"><a href=\"#/article/");t.b(t.v(t.f("id",c,p,0)));t.b("/");t.b(t.v(t.f("i",c,p,0)));t.b("\" class=\"\"><div class=\"number\">");t.b(t.v(t.f("i",c,p,0)));t.b(".</div><div class=\"feed\"><b>");t.b(t.t(t.f("title",c,p,0)));t.b("</b></div></a></li>");return t.fl(); },partials: {}, subs: {  }}),
		'login': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<div class=\"post-content\">    <section class=\"grouped-tableview\">            <form method=\"post\">            <table>                <tbody>                    <tr>                        <td><label for=\"username\">Username</td>                        <td><input id=\"username\" class=\"\" placeholder=\"username\" type=\"text\" autocorrect=\"off\" autocapitalize=\"off\" autofocus=\"autofocus\"></td>                    </tr>                    <tr>                        <td><label for=\"password\">Password</label></td>                        <td><input id=\"password\" class=\"\" placeholder=\"password\" type=\"password\"></td>                    </tr>                    <tr>                        <td><input type=\"button\" class=\"\" value=\"Login\" id=\"login\"></td>                    </tr>                    <tr>                        <td colspan=\"2\"><span class=\"view hidden login-error\"></span>                    </tr>                </tbody>            </table>            </form>    </section></div>");return t.fl(); },partials: {}, subs: {  }}),
		'remove-feed-inline': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<span class=\"q\">    ");t.b(t.rp("<feed_partial0",c,p,""));t.b("    <span class=\"question\"><a class=\"button delete\" href=\"#/\">Delete</a> this feed? <a class=\"cancel\" href=\"#/\">cancel</a> </span></span>");return t.fl(); },partials: {"<feed_partial0":{name:"feed_partial", partials: {}, subs: {  }}}, subs: {  }}),
		'remove-feed': new t({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<span>    <span class=\"question\"><a class=\"button delete\" href=\"#/\">Delete</a> <a class=\"cancel\" href=\"#/\">cancel</a> ");t.b(t.v(t.f("title",c,p,0)));t.b(" feed? </span></span>");return t.fl(); },partials: {}, subs: {  }}),
	}
};;dddns = typeof dddns === 'undefined' ? {} : dddns;
dddns['ddd'] = function(w) {
    var d = w.document,
        body = d.body;

    if (typeof TEMPLATES === 'undefined') {
        dddns.TF(Hogan.Template);
    }

    //var $ = w.$ = function(id){
    //return d.getElementById(id);
    //};

    var pubsubCache = {},
        clone = function(obj) {
            var target = {};
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) target[i] = obj[i];
            }
            return target;
        };

    var ddd = {
        pollRetries: 0,
        // PubSub
        pub: function(topic, data) {
            var t = pubsubCache[topic];
            if (!t) return;
            for (var i = 0, l = t.length; i < l; i++) {
                t[i].call(this, data);
            }
        },
        sub: function(topic, fn) {
            if (!pubsubCache[topic]) pubsubCache[topic] = [];
            pubsubCache[topic].push(fn);
        },
        prevView: null,
        currentView: null,
        hideAllViews: function() {
            var views = d.querySelectorAll('.view');
            for (var i = 0, l = views.length; i < l; i++) {
                $(views[i]).addClass('hidden');
            }
        },
        tmpl: function(template, data) {
            var t = TEMPLATES[template];
            if (!t) return;
            if (!data) return t;
            return t.render(data);
        },
        formatDate: function(unix, with_time) {
            var dd = new Date(unix * 1000);
            var txt = "" + dd.getFullYear() + "/" + ddd.pad(dd.getMonth() + 1) + "/" + ddd.pad(dd.getDate());
            if (with_time) {
                txt += " " + ddd.pad(dd.getHours()) + ":" + ddd.pad(dd.getMinutes());
            }
            return txt;
        },
        pad: function(num) {
            if (num < 10) return "0" + num;
            return num;
        },
        remove: function(list, index) {
            if (index === 0)
                return list.slice(1);
            else if (index == list.length - 1)
                return list.slice(0, list.length - 1);
            else {
                var left = list.slice(0, index);
                var right = list.slice(index + 1, list.length);
                left.push.apply(left, right);
                return left;
            }
        },

        pollServer: function() {
            if (typeof ddd.config.refresh_every === 'undefined' || !ddd.config.refresh_every) return;
            if (ddd.config.refresh_every <= 0) return;
            if (ddd.pollTimer) {
                clearTimeout(ddd.pollTimer);
            }
            ddd.pollTimer = setTimeout(ddd.pollRefresh, 1000 * 60 * ddd.config.refresh_every); // every x minutes
            ddd.pollRetries = 0;
        },

        pollServerError: function() {
            //exponential back off
            ddd.pollRetries = ddd.pollRetries + 1;
            var milliMinutes = 1000 * 60 * ddd.config.refresh_every;
            ddd.pollTimer = setTimeout(ddd.pollRefresh, Math.pow(2, ddd.pollRetries) * milliMinutes); // every 15m
        },

        pollRefresh: function() {
            var currentdate = new Date();
            var msg = "Poll at " + currentdate.getFullYear() + "/" + (currentdate.getMonth() + 1) + "/" + currentdate.getDate() + " " + currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();
            console.log(msg);
            ddd.feeds.reload(true);
        },
    };

    var timeout = 20000; // 20 seconds timeout

    var doLogin = function(username, password, success, error) {
        var onlogin = function(data) {
            // store the sid
            if (data.session_id) {
                amplify.store('feeds-sid', data.session_id);
            }
            success(data);
        };
        var onfail = function(e) {
            error(e);
        };
        loginMsg = {
            op: "login",
            user: username,
            password: password
        };
        req(loginMsg, onlogin, onfail);
    };

    var req = function(msg, success, error) {
        if (!success) success = function() {};
        if (!error) error = function() {};

        var onsuccess = function(data, status, xhr) {
            var response = data;
            //try {
            //response = JSON.parse(this.responseText);
            //} catch (e){}
            console.log('<- ', response);
            if (response && !response.error) {
                if (response.content) {
                    var not_logged_in = response.content.error;
                    if (not_logged_in === 'NOT_LOGGED_IN') {
                        if (/login/i.test(location.href)) {
                            return error(response.content);
                        } else {
                            amplify.store('feeds-sid', null); // remove from store
                            ruto.go("/login");
                            ddd.login.render();
                        }
                        //return retryLogin(msg, success, error);  
                    }
                }
                success(response.content);
                //postMessage({
                //url: url,
                //response: response
                //});
            } else {
                error(response);
                //postMessage({
                //url: url,
                //error: true
                //});
            }
        };

        var onerror = function(e) {
            console.log('*- ', e);
            error(JSON.parse(JSON.stringify(e)));
            //postMessage({
            //url: url,
            //error: JSON.parse(JSON.stringify(e))
            //});
        };

        var sid = amplify.store('feeds-sid');
        if (sid) msg.sid = sid;
        console.log("->", msg);
        $.ajax({
            type: 'POST',
            url: ddd.config.api + "api/",
            contentType: 'application/json',
            dataType: 'json',
            timeout: timeout,
            data: JSON.stringify(msg),
            success: onsuccess,
            error: onerror
        });
    };

    var ttrss = {
        feeds: function(msg, success, error) {
            req(msg, success, error);
        },

        headlines: function(msg, success, error) {
            req(msg, success, error);
        },

        login: function(username, password, success, error) {
            doLogin(username, password, success, error);
        },

        updateArticle: function(msg, success, error) {
            msg.op = "updateArticle";
            req(msg, success, error);
        },

        catchupFeed: function(msg, success, error) {
            req(msg, success, error);
        },

        subscribeToFeed: function(msg, success, error) {
            req(msg, success, error);
        },
        unsubscribeFeed: function(msg, success, error) {
            req(msg, success, error);
        },
        getConfig: function(msg, success, error) {
            req(msg, success, error);
        },
    };

    var tmpl = ddd.tmpl;
    var platform = "Mac";

    // Fix browsers freak out of amplify.store.sessionStorage not a function
    if (!amplify.store.sessionStorage || typeof amplify.store.sessionStorage != 'function') {
        amplify.store.sessionStorage = amplify.store.memory; // Fallback to in-memory storage
    }

    var $homeScroll = d.querySelector('#view-home .scroll'),
        $homeScrollSection = $homeScroll.querySelector('section'),
        loadingFeeds = false,
        loadingHeadlines = false;

    var selections = {};

    ddd.feeds = {
        skip: 0,
        skipFeeds: 0,
        feedsRemoved: {},
        markupFeed: function(feed) {
            feed.type = feed.unread > 0 ? "unread" : "read";
            if (feed.title === "") feed.title = "&nbsp;";
            if (feed.id < 0) {
                if (feed.id === -1) feed.urlid = "starred";
                else if (feed.id === -2) feed.urlid = "published";
                else if (feed.id === -3) feed.urlid = "fresh";
                else if (feed.id === -4) feed.urlid = "all";
                else if (feed.id === -6) feed.urlid = "recent";
            }
            var tmpl1 = tmpl('feeds');
            var tmpl2 = tmpl('feed-partial');

            var hasIcon = feed.has_icon && ddd.config.iconPath;
            if (hasIcon) feed.icon = ddd.config.iconPath;
            var html = tmpl1.render(feed, {
                feed_partial: tmpl2
            });
            if (hasIcon) delete feed.icon;
            return html;
        },
        markupHeadline: function(article) {
            article.url = '#/article/' + article.id;
            article.type = article.unread > 0 ? "unread" : "read";
            return tmpl('headline', article);
        },
        markupFeeds: function(data, i) {
            var html = '';
            if (!i) i = 1;
            var markupFeed = ddd.feeds.markupFeed;
            data.forEach(function(item) {
                item.i = i++;
                html += markupFeed(item);
            });
            return html;
        },
        markupHeadlines: function(data, i) {
            var html = '';
            if (!i) i = 1;
            var markupHeadline = ddd.feeds.markupHeadline;
            data.forEach(function(item) {
                item.i = i++;
                html += markupHeadline(item);
            });
            return html;
        },
        feedsAndMore: function(data, i) {
            var html = ddd.feeds.markupFeeds(data, i);
            html += data.length >= ddd.config.FEED_LIMIT ?
                '<li><a class="more-link">More&hellip;<span class="loader"></span></a></li>' : '';

            if (data.length >= ddd.config.FEED_LIMIT) {
                var next = ddd.feeds.skipFeeds;
                if (!next) next = 0;
                ddd.feeds.skipFeeds = next + ddd.config.FEED_LIMIT;
            }
            return html;
        },

        render: function(opts) {
            if (loadingFeeds) return;
            if (!opts) opts = {};
            var cached = amplify.store('ddd-cached');
            var tmpl1 = tmpl('feeds-load');

            var loadFeeds = function(_data) {
                var data = _data.slice();
                var html = '<ul class="tableview tableview-links" id="feedslist">' +
                    ddd.feeds.feedsAndMore(data) + '</ul>';
                $homeScrollSection.innerHTML = html;
                ddd.feed.showSelection();
                ddd.pub('onRenderNews');
            };

            if (cached) {
                var feeds = amplify.store('feeds');
                var feedsById = amplify.store('feeds-by-id');
                var delay = opts.delay;
                if (delay) {
                    loadingFeeds = true;
                    $homeScrollSection.innerHTML = tmpl1.render({
                        loading: true
                    });
                    setTimeout(function() {
                        loadingFeeds = false;
                        loadFeeds(feeds);
                    }, delay);
                } else {
                    loadFeeds(feeds);
                }
            } else {
                loadingFeeds = true;
                $homeScrollSection.innerHTML = tmpl1.render({
                    loading: true
                });
                var showError = function() {
                    $homeScrollSection.innerHTML = tmpl1.render({
                        load_error: true
                    });
                    ddd.pub('logAPIError', 'news');
                };
                var unread_only = amplify.store('view-mode');
                msg = {
                    op: "getFeeds",
                    cat_id: "-3", //exclude virtual feeds for the moment
                    unread_only: unread_only ? "true" : "false",
                };
                //if(ddd.config.FEED_LIMIT) msg['limit'] = "" + ddd.config.FEED_LIMIT;

                ttrss.feeds(msg, function(data) {
                    feedsRemoved = {};
                    loadingFeeds = false;
                    if (!data || data.error) {
                        showError();
                        return;
                    }
                    byId = {};
                    for (var i = 0, l = data.length; i < l; i++) {
                        var item = data[i];
                        item.index = i;
                        byId[item.id] = item;
                    }
                    amplify.store('feeds', data);
                    amplify.store('feeds-by-id', byId);
                    amplify.store('ddd-cached', true, {
                        expires: 1000 * 60 * 10 // 10 minutes
                    });
                    loadFeeds(data);
                    ddd.pollServer();
                }, function(e) {
                    loadingFeeds = false;
                    showError();
                    ddd.pollServerError();
                });
            }
        },
        settings: function() {
            ddd.feeds.render({
                delay: 300 // Cheat a little to make user think that it's doing something
            });
        },
        moreFeeds: function(target) {
            $(target).addClass('loading');

            var showError = function() {
                var tmpl1 = tmpl('feeds-load');
                $(target).replaceWith(tmpl1.render({
                    load_error: true
                }));
                ddd.pub('logAPIError', 'news');
            };

            var unread_only = amplify.store('view-mode');
            msg = {
                op: "getFeeds",
                cat_id: "-3", //exclude virtual feeds for the moment
                unread_only: unread_only ? "true" : "false",
                limit: "" + ddd.config.FEED_LIMIT,
                offset: "" + ddd.feeds.skipFeeds,
            };
            ttrss.feeds(msg, function(data) {
                loadingFeeds = false;
                $(target).removeClass('loading');
                var targetParent = target.parentNode;
                if (!targetParent) return;
                if (targetParent.parentNode) targetParent.parentNode.removeChild(targetParent);
                if (!data || data.error) {
                    showError();
                    return;
                }
                var list = amplify.store('feeds');
                var feedsById = amplify.store('feeds-by-id');
                if (list) list.push.apply(list, data);
                for (var i = 0, l = data.length; i < l; i++) {
                    var item = data[i];
                    item.index = i;
                    feedsById[item.id] = item;
                }
                amplify.store('feeds', list);
                amplify.store('feeds-by-id', feedsById);
                amplify.store('ddd-cached', true, {
                    expires: 1000 * 60 * 10 // 10 minutes
                });
                var html = ddd.feeds.feedsAndMore(data, ddd.feeds.skipFeeds + 1);
                $('#feedslist').append(html);
                ddd.feeds.skipFeeds += ddd.config.FEED_LIMIT;
            }, function(e) {
                loadingFeeds = false;
                showError();
            });
        },

        more: function(target) {
            console.log('more target is', target);
            $(target).addClass('loading');
            var feed_id = ddd.feeds.currentID;
            if (!feed_id) return;
            var unread_only = amplify.store('view-mode');

            msg = {
                op: "getHeadlines",
                feed_id: "" + feed_id,
                show_content: "true",
                view_mode: unread_only ? "unread" : "",
                skip: "" + ddd.feeds.skip,
                limit: "" + ddd.config.ARTICLE_LIMIT,
            };
            var feedsById = amplify.store('feeds-by-id');
            var item = feedsById[feed_id];

            ttrss.headlines(msg, function(_data) {
                if (ddd.feeds.currentID != feed_id) return;
                $(target).removeClass('loading');
                var targetParent = target.parentNode;
                if (!targetParent) return;
                if (targetParent.parentNode) targetParent.parentNode.removeChild(targetParent);
                if (!_data) return;
                var data = _data.slice();
                if (ddd.feed.currentHeadlines) ddd.feed.currentHeadlines.push.apply(ddd.feed.currentHeadlines, data);
                var html = ddd.feeds.markupHeadlines(data, ddd.feeds.skip + 1);
                // do we still need more?
                html += data.length >= ddd.config.ARTICLE_LIMIT ?
                    '<li><a class="more-link">More&hellip;<span class="loader"></span></a></li>' : '' +
                    '</ul>';
                $('#dddlist').append(html);
                //$('dddlist').insertAdjacentHTML('beforeend', html);
                ddd.feeds.skip += ddd.config.ARTICLE_LIMIT;
            }, function(e) {});
        },
        reload: function(force) {
            if (force) {
                amplify.store('ddd-cached', null);
                amplify.store('feeds', null);
                amplify.store('feeds-by-id', null);
                ddd.feeds.render();
            }
        },

        markAllRead: function() {
            var curFeed = ddd.getSelFeed();
            if (!curFeed) {
                // this is an interesting case. if a feed has 1 article and navigated to the article
                // it gets marked read so when you try to markAllRead the above call to getSelFeed
                // will return null since the feed has been removed from feeds-by-id.
                // The right thing feels like to navigate back to the list of feeds
                if (ddd.currentView === 'article') {
                    ruto.go('/');
                }
                return;
            }
            var feed_id = curFeed.id;
            if (feed_id < 0) return;

            msg = {
                op: "catchupFeed",
                feed_id: "" + feed_id,
            };
            ttrss.catchupFeed(msg, function() {}, function() {});

            var unread_only = amplify.store('view-mode');
            if (unread_only)
                ddd.feed.currentHeadlines = [];
            curFeed.unread = 0;
            ddd.feed.markFeedRead(curFeed);
            // if we marked all read from feed or article view go back to top

            if (unread_only) {
                if (ddd.currentView !== 'home') ruto.go('/');
            }
            ddd.feed.showSelection();
        },

        escapePressed: function() {
            ddd.feeds.removeFeedsInline(true);
        },

        removeFeedsInline: function(cancel) {
            var feed = ddd.feeds.feedToDelete;
            if (!feed) return;
            var liEle = $('#feed-' + feed.id);
            var html = ddd.feeds.markupFeed(feed);
            ddd.pub('onDialogDone');
            if (cancel) {
                $(liEle).replaceWith(html);
                return;
            }
            ddd.feeds.removeFeeds(false);
        },

        removeFeeds: function(cancel) {
            if (cancel) {
                $('#view-home h1').html('Feeds');
                return;
            }
            //$('#view-home h1').html('Feeds');
            var feed = ddd.feeds.feedToDelete;
            if (!feed) return;
            var msg = {
                op: 'unsubscribeFeed',
                feed_id: "" + feed.id,
            };
            ttrss.unsubscribeFeed(msg, function(data) {
                var msg = "Feed removed";
                var claz = "good";
                if ('error' in data) {
                    msg = "Feed not found";
                    claz = "bad";
                } else {
                    // remove from cache and UI
                    ddd.feeds.removeFromStoreAndUi(feed);
                }
                $('.msg').attr('class', 'msg ' + claz).html(msg).show();
                $('#view-home h1').html('Feeds');
                setTimeout(function() {
                    $('.msg').hide();
                }, 3000);
            }, function(data) {
                console.log('unsub err', data);
            });
        },

        removeFeedInline: function() {
            if (ddd.currentView !== 'home') return;
            var sel = ddd.getSel();
            var ele = $(sel.siz)[sel.sel];
            var feed = ddd.getSelFeed();
            feed.i = feed.index + 1;
            ddd.feeds.feedToDelete = feed;
            var linkEle = $(ele).find('a');
            var tmpl1 = tmpl('remove-feed-inline');
            var tmpl2 = tmpl('feed-partial');
            var html = tmpl1.render(feed, {
                feed_partial: tmpl2
            });
            $(ele).html(html);
            ddd.pub('onDialog');
        },

        removeFeed: function() {
            // this only works in the feeds view
            if (ddd.currentView !== 'home') return;
            var sel = ddd.getSel();
            var ele = $(sel.siz)[sel.sel];
            var feed = ddd.getSelFeed();
            ddd.feeds.feedToDelete = feed;
            var tmpl1 = tmpl('remove-feed');
            $('#view-home h1').html(tmpl1.render({
                id: feed.id,
                title: feed.title
            }));
            //var feedEle = '#' + ele.getAttribute('id') + ' a .feed';
            //$('#' + ele.getAttribute('id') + ' a').removeAttr('href');
            //$(tmpl1.render({})).appendTo(feedEle)
            //$(tmpl1.render({title: feed.title})).appendTo('#' + ele.getAttribute('id') + ' a .feed')
        },

        addFeed: function() {
            var tmpl1 = tmpl('add-feed');
            $('#view-home h1').html(tmpl1.render({}));
        },

        addFeedClicked: function(cancel) {
            if (cancel) {
                $('#view-home h1').html('Feeds');
                return;
            }
            var txt = $('#add-feed').val();
            if (txt.length === 0) return;

            msg = {
                op: 'subscribeToFeed',
                feed_url: txt,
            };
            ttrss.subscribeToFeed(msg, function(data) {
                var msg = "Feed added";
                var claz = "bad";
                var status = data.status;
                if (status) {
                    var code = status.code;
                    var err = status.message;
                    if (code === 0) {
                        msg = "Feed already exists";
                        claz = "good";
                    } else if (code == 1) {
                        msg = "Feed added";
                        claz = "good";
                    } else if (code == 2) msg = "Invalid URL. " + err;
                    else if (code == 3) msg = "Invalid URL. " + err;
                    else if (code == 4) msg = "Invalid URL. " + err;
                    else if (code == 5) msg = "Invalid URL. " + err;
                }
                $('.msg').addClass(claz).html(msg).show();
                if (claz === 'good') {
                    $('#view-home h1').html('Feeds');
                    setTimeout(function() {
                        $('.msg').hide();
                    }, 3000);
                }
            }, function(e) {
                console.log('in sub e is', e);
                $('.msg').addClass('bad').html('Error adding feed ').show();
                //$('#view-home h1').html('Feeds');
                //setTimeout(function(){
                //$('.msg').hide();
                //}, 3000);
            });
        },

        storeAgain: function(feed) {
            // this pains me but the changes need to be written back into the store
            var list = amplify.store('feeds');
            var index = 0;
            for (var i = 0, l = list.length; i < l; i++) {
                if (list[i].id === feed.id) {
                    list[i] = feed;
                    break;
                }
            }
            amplify.store('feeds', list);

            var map = amplify.store('feeds-by-id');
            map[feed.id] = feed;
            amplify.store('feeds-by-id', map);
        },

        cmd_toggleUnread: function() {
            amplify.store('view-mode', !amplify.store('view-mode'));
            if (ddd.currentView === 'feed') {
                ddd.feed.currentHeadlines = null;
                var feedsById = amplify.store('feeds-by-id');
                ddd.feed.render(ddd.feeds.currentID, feedsById[ddd.feeds.currentID]);
            }

            // unfortunately the feeds need to be reloaded even when looking at headlines
            // otherwise when you go back up ther list of feeds will be wrong
            ddd.feeds.reload(true);
            ddd.feeds.skipFeeds = 0;
            ddd.feeds.render();
        },

        getConfig: function() {
            msg = {
                op: "getConfig",
            };
            ttrss.getConfig(msg, function(data) {
                for (var i in data) {
                    if (data.hasOwnProperty(i)) ddd.config[i] = data[i];
                }
                if ('icons_url' in ddd.config) {
                    ddd.config.iconPath = ddd.config.api + ddd.config.icons_url + '/';
                    ddd.feeds.render();
                }
            }, function(e) {});
        },

        removeFromStoreAndUi: function(feed) {
            var list = amplify.store('feeds');
            var index = 0;
            for (var i = 0, l = list.length; i < l; i++) {
                if (list[i].id === feed.id) {
                    index = i;
                    break;
                }
            }
            list = ddd.remove(list, index);
            amplify.store('feeds', list);

            var map = amplify.store('feeds-by-id');
            delete map[feed.id];
            amplify.store('feeds-by-id', map);

            var feedli = $('#feed-' + feed.id);
            feedli.remove();
        },
    };

    ddd.feed = {
        currentID: null,
        currentHeadlines: null,
        renderTitle: function(feed, siz) {
            var hasIcon = feed.has_icon && ddd.config.iconPath;
            if (hasIcon) {
              $(siz).html('<img class="fav" src=' + ddd.config.iconPath + feed.id + ".ico>" +
                feed.title);
            } else {
              $(siz).html(feed.title);
            }
        },

        render: function(_id, _feed) {
            if (!_id) return;

            var id = parseInt(_id, 10);
            if (ddd.feeds.currentID === id && ddd.feed.currentHeadlines !== null) {
                ddd.feed.showSelection();
                return;
            } else {
                //$('#view-feed .scroll').empty();
            }
            if (loadingHeadlines) return;

            ddd.feeds.currentID = id;
            ddd.feeds.skip = 0;
            var feed = _feed;
            if (!feed) {
                feed = amplify.store('feeds-by-id')[id];
            }
            if (feed)
                ddd.feed.renderTitle(feed, '#view-feed h1')

            var unread_only = amplify.store('view-mode');
            loadingHeadlines = true;
            tmpl1 = tmpl('feeds-load');
            $('#view-feed .scroll').html(tmpl1.render({
                loading: true
            }));

            msg = {
                op: "getHeadlines",
                feed_id: "" + id,
                show_content: "true",
                view_mode: unread_only ? "unread" : "",
                limit: "" + ddd.config.ARTICLE_LIMIT,
            };
            ttrss.headlines(msg, function(data) {
                loadingHeadlines = false;
                if (ddd.feeds.currentID != id) return;
                ddd.feed.renderHeadlines(data, id);
                ddd.feed.showSelection();
            }, function(e) {
                loadingHeadlines = false;
            });
        },

        showSelection: function(view) {
            // select the current feed or headline
            var sel = ddd.getSel(view);
            if (sel === undefined) return;
            items = $(sel.siz);
            if (sel.sel >= items.length) {
                // for when you select the last itme
                if (sel.sel >= items.length) {
                    sel.sel = items.length - 1;
                    if (sel.sel < 0) sel.sel = 0;
                }
            }
            $(items[sel.sel]).addClass('sel');
        },

        renderHeadlines: function(_data, feed_id) {
            if (!_data) return;
            var data = _data.slice(),
                tmpl1 = tmpl('feeds-load');
            ddd.feed.currentHeadlines = data;
            var html = '<ul class="tableview tableview-links" id="dddlist">' +
                ddd.feeds.markupHeadlines(data) +
                (data.length >= ddd.config.ARTICLE_LIMIT ?
                '<li><a class="more-link">More&hellip;<span class="loader"></span></a></li>' : '') +
                '</ul>';
            if (data.length >= ddd.config.ARTICLE_LIMIT) {
                var next = ddd.feeds.skip;
                if (!next) next = 0;
                ddd.feeds.skip = next + ddd.config.ARTICLE_LIMIT;
            }
            $('#view-feed .scroll').html(html);
            ddd.pub('adjustCommentsSection');
            ddd.pub('onRenderComments');
        },

        markRead: function(article, index) {
            if (!article) return;
            if (!article.unread) return;
            article.unread = false;
            msg = {
                article_ids: "" + article.id,
                mode: "0",
                field: "2"
            };
            ttrss.updateArticle(msg, function() {}, function() {});

            // remove the article from the list
            var unread_only = amplify.store('view-mode');
            if (unread_only) {
                ddd.feed.currentHeadlines = ddd.remove(ddd.feed.currentHeadlines, index);
            }
            ddd.feed.renderHeadlines(ddd.feed.currentHeadlines, ddd.feeds.currentID);

            // now update the unread count on the feed
            // first update our local cache
            var feedsByMap = amplify.store('feeds-by-id');
            var feed = feedsByMap[ddd.feeds.currentID];
            feed.unread = feed.unread - 1;
            if (feed.unread <= 0 && amplify.store('view-mode')) {
                ddd.feeds.removeFromStoreAndUi(feed);
                ddd.feeds.feedsRemoved[feed.id] = feed;
            } else {
                ddd.feed.replaceFeedUI(feed);
                ddd.feeds.storeAgain(feed);
            }
        },

        markFeedRead: function(feed) {
            feed.type = "read";
            var unread_only = amplify.store('view-mode');
            if (unread_only && feed.unread <= 0) {
                //remove from:
                //    the list of feeds stored in local storage
                //    the map of feeds stored in local storage
                //    the UI
                ddd.feeds.removeFromStoreAndUi(feed);
                ddd.feeds.feedsRemoved[feed.id] = feed;
            } else {
                // just update the UI since it doesn't need to be removed
                var feedli = $('#feed-' + feed.id);
                if (feedli.length === 0) return;
                $(feedli[0]).find('.count').text(feed.unread);
            }
            if (!unread_only) {
                // need to mutate the read/unread state of articles
                for (var i = 0, l = ddd.feed.currentHeadlines.length; i < l; i++) {
                    var a = ddd.feed.currentHeadlines[i];
                    a.unread = false;
                }
                $('#view-feed .unread').attr('class', 'read');
                ddd.feed.replaceFeedUI(feed);
            }
        },

        addArticleToUI: function(article, feed) {
            // when the article was marked read the feed count was NOT decremented
            // in the store so no need to undo that
            if (!article) return;
            if (ddd.feeds.currentID != article.feed_id) return;
            var headlines = ddd.feed.currentHeadlines;
            var unread_only = amplify.store('view-mode');
            if (unread_only) {
                // only add the article if the view mode is unread_only since show read mode will 
                // already have the article in the list
                headlines.splice(article.i - 1, 0, article); // i is the display index which is 1 based
            }
            ddd.feed.renderHeadlines(headlines, article.feed_id);

            // update the feeds list too since the unread count changed
            ddd.feed.replaceFeedUI(feed);
        },

        replaceFeedUI: function(feed) {
            feed.i = feed.index + 1;
            var html = ddd.feeds.markupFeed(feed);
            $('#feed-' + feed.id).replaceWith(html);
        }
    };

    ddd.login = {
        render: function() {
            var sid = amplify.store('feeds-sid');
            if (sid) {
                ddd.feeds.getConfig();
                ddd.feeds.render();
                ddd.pollRefresh();
                ruto.go('/');
                return;
            }
            ruto.go('/login');
            var tmpl1 = tmpl('login');
            $('#view-login .scroll').html(tmpl1.render({}));
        },
        doLogin: function() {
            var un = $('#username').val();
            var pass = $('#password').val();
            ttrss.login(un, pass, function(suc) {
                // emptying the div was the only reliable way to not have the input eat the keyevents
                $('#view-login .scroll').empty();
                ruto.go('/');
                ddd.pollRefresh();
                $('#view-home .scroll').focus();
            }, function(fail) {
                console.log('login failed', fail);
                $(".login-error").html('Login failed');
                $(".login-error").removeClass('hidden');
            });
        }
    };

    ddd.article = {
        currentID: null,
        currentArticle: null,

        render: function(id, index) {
            if (!id) return;
            ddd.article.currentID = id;
            var headlines = ddd.feed.currentHeadlines;
            if (!headlines) return;
            var article = headlines[index];
            if (!article) return;
            ddd.article.currentArticle = article;
            var feed = amplify.store('feeds-by-id')[ddd.feeds.currentID];
            ddd.feed.renderTitle(feed, '#view-article h1')
            ddd.feed.markRead(article, index);

            article.hasContent = true;
            if (article.updated) {
                article.date = ddd.formatDate(article.updated, true);
            }
            back = '#/feed/' + article.feed_id;
            $('#view-article .header-back-button').attr('href', back);

            var tmpl1 = tmpl('article');
            $('#view-article .scroll').html(tmpl1.render(article));
        },

        cmd_next: function(dir) {
            if (ddd.currentView !== 'article') return;
            console.log('article.cmd_next dir=', dir, ddd.currentView);

        },

        cmd_markUnread: function() {
            console.log('mark unread');
            if (ddd.currentView === 'home') return;
            //if(ddd.currentView !== 'article') return;
            var article = ddd.article.currentArticle;
            if (ddd.currentView === 'feed') {
                var sel = ddd.getSel();
                article = ddd.feed.currentHeadlines[sel.sel];
            }
            if (!article) return;
            if (article.unread) return;
            article.unread = true;
            msg = {
                article_ids: "" + article.id,
                mode: "1",
                field: "2"
            };
            ttrss.updateArticle(msg, function() {}, function() {});

            var feed = amplify.store('feeds-by-id')[article.feed_id];
            if (feed) {
                feed.unread = feed.unread + 1;
                ddd.feeds.storeAgain(feed);
                ddd.feed.addArticleToUI(article, feed);
                ddd.feed.renderHeadlines(ddd.feed.currentHeadlines, ddd.feeds.currentID);
                // advance the selection if marking unread from feed view
                if (ddd.currentView === 'feed') {
                    ddd.cmd_move_sel(1);
                }
                return;
            }
            // feed was not found in the feedsById map above
            // that's OK that means this article was the last one in the feed and
            // it has already been moved
            feed = ddd.feeds.feedsRemoved[article.feed_id];
            if (!feed) {
                // not sure what to do here, can't find the feed in either map
                return;
            }
            var feedsById = amplify.store('feeds-by-id');
            feed.unread = 1;
            var list = amplify.store('feeds');
            list.splice(feed.index, 0, feed);
            amplify.store('feeds', list);

            delete ddd.feeds.feedsRemoved[article.feed_id];
            feedsById[article.feed_id] = feed;
            amplify.store('feeds-by-id', feedsById);
            ddd.feed.addArticleToUI(article, feed);
            ddd.feeds.render();
        },

    };

    ddd.resetSelections = function() {
        selections = {
            "feeds": {
                sel: 0,
                name: "feeds",
                siz: "#feedslist li"
            },
            "feed": {
                sel: 0,
                name: "feed",
                siz: "#dddlist li"
            },
            "article": {
                sel: 0,
                name: "article",
                siz: "#dddlist li"
            },
        };
        return selections;
    };

    ddd.init = function() {
        var unread_only = amplify.store('view-mode');
        if (unread_only === undefined)
            amplify.store('view-mode', true);
        ddd.login.render();
        ddd.resetSelections();
        //ddd.feeds.render();
        ruto.init();
        var userAgent = navigator.userAgent;
        if (userAgent.indexOf("Mac") != -1)
            platform = "Mac";
        else if (userAgent.indexOf("Linux") != -1)
            platform = "Linux";
        else
            platform = "Windows";
    };

    ddd.cmd_enter = function() {
        var sel = ddd.getSel();
        if (sel === undefined) return;

        if (ddd.currentView == 'article') {
            ddd.cmd_open();
            return;
        }
        items = $(sel.siz);
        if (!items) return;
        if (sel.sel < 0 || sel.sel >= items.length) return;
        var as = $(items[sel.sel]).find('a');
        if (!as || as.length === 0) return;
        // when you enter feed A, scroll to the last headline, exit and then enter another feed 
        // reset the selection index
        if (ddd.currentView === 'home') {
            var next = as[0].href;
            if (sel.cur != next) {
                ddd.getSel('feed').sel = 0;
            }
            sel.cur = next;
        }
        $(as[0]).click();
    };

    ddd.cmd_goUp = function() {
        if (ddd.currentView === 'home') return;
        if (ddd.currentView === 'article') {
            // when there are no more headlines in a feed it will be removed by this point
            // so go back to the top instead of showing an empty list
            var unread_only = amplify.store('view-mode');
            feed = ddd.getSelFeed();
            if (unread_only && (!feed || feed.unread === 0)) {
                ruto.go('/');
                return;
            }
        }
        ruto.back();
    };

    ddd.getSel = function(view) {
        if (view !== undefined) {
            kind = view;
        } else {
            if (ddd.currentView === 'home') kind = 'feeds';
            else kind = ddd.currentView;
        }
        if (!kind) return undefined;
        return selections[kind];
    };

    ddd.getSelFeed = function() {
        var sel = ddd.getSel();
        var feedsById = amplify.store('feeds-by-id');
        if (sel.name === 'feeds') {
            var selectors = $(sel.siz);
            var one = selectors[sel.sel];
            if (!one) return; // can happen when there are no feeds
            // id="feed-xxxxx"
            var feed_id = one.getAttribute('id').substring(5); // "feed-".length
            return feedsById[parseInt(feed_id, 10)];
        } else if (sel.name === 'feed') {
            return feedsById[ddd.feeds.currentID];
        } else if (sel.name === 'article') {
            return feedsById[ddd.feeds.currentID];
        }
    };

    ddd.scrollPage = function(dir, sel) {
        window.scrollBy(0, 60 * dir);
    };

    ddd.cmd_open = function() {
        var href = location.href;
        var opener = $('#opener');
        var to_open;
        if (ddd.currentView === 'article') {
            articleA = $('#full_article');
            if (!articleA) return;
            //$(to_open).click();
            to_open = articleA.attr('href');
            //return;
        } else if (ddd.currentView === 'feed') {
            var sel = ddd.getSel();
            if (sel === undefined) return;
            var headlines = ddd.feed.currentHeadlines;
            if (headlines && sel.sel < headlines.length) {
                var article = headlines[sel.sel];
                to_open = article.link;
                if (!to_open) return;
                ddd.feed.markRead(article, sel.sel);
            }
        }
        if (!to_open) return;
        opener.attr('href', to_open);
        //console.log('to_open=', to_open);
        //opener.click();
        //
        // open in a background tab if possible
        //<https://developer.mozilla.org/en/docs/DOM/event.initMouseEvent>
        //https://github.com/philc/vimium/blob/master/lib/dom_utils.coffee
        var evt = document.createEvent("MouseEvents");
        if (platform === 'Mac') {
            evt.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, true, false, false, true, 0, null);
        } else {
            evt.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, true, false, false, false, 0, null);
        }
        opener[0].dispatchEvent(evt);

        var unread_only = amplify.store('view-mode');
        feed = ddd.getSelFeed();
        if (unread_only && (!feed || feed.unread === 0)) {
            ruto.go('/');
            return;
        }
        ddd.feed.showSelection();
    };

    ddd.cmd_click_feed = function(target) {
        // if we're on the home view and click a feed set the selection
        // here so the clicked feed == selected feed
        var sel = ddd.getSel('feeds');
        if (sel) $(sel.siz).removeClass('sel');
        // unfortunatley the feed's index can not be used since the index does not adjust as feeds
        // are marked read so this search must be done
        var all = $(sel.siz);
        var clickedIndex = all.indexOf(target);
        if (clickedIndex != -1) {
            sel.sel = clickedIndex;
        }
    };

    ddd.cmd_move_sel = function(dir) {
        var sel = ddd.getSel();
        if (sel === undefined) return;
        if (sel.name === 'article') {
            ddd.scrollPage(dir, sel);
            return;
        }
        sel.sel = sel.sel + dir;
        if (sel.sel < 0) {
            sel.sel = 0;
            return;
        }
        //items = $('dddlist').querySelectorAll('li');
        items = $(sel.siz);

        if (sel.sel >= items.length) {
            sel.sel = items.length - 1;
            return;
        }
        if (items.length === 0 || sel.sel >= items.length) return;
        $(items[sel.sel - dir]).removeClass('sel');
        $(items[sel.sel]).addClass('sel');

        //var scrollTop = document.body.scrollTop;
        var elem = items[sel.sel];
        var elemTop = elem.offsetTop;
        var docHeight = document.body.clientHeight;
        var isVisible = isScrolledIntoView(elem);
        if (isVisible) return;
        var offsetHeight = elem.offsetHeight;
        if (dir < 0) {
            document.body.scrollTop = elemTop - (offsetHeight - 5);
        } else {
            var inc = offsetHeight;
            document.body.scrollTop = document.body.scrollTop + inc;
            //console.log('inc scrollTopBy ' + inc + ' scrollTop=' + document.body.scrollTop);
        }
        //$('body').scrollTop($('#questions').offset().top - 75);
    };

    function isScrolledIntoView(elem) {
        var docViewTop = document.body.scrollTop;
        // this may not work everywhere
        // http://stackoverflow.com/questions/1823691/html-dom-width-height-of-visible-window
        var docViewBottom = docViewTop + window.innerHeight;

        var elemTop = elem.offsetTop;
        var elemBottom = elemTop + elem.offsetHeight;

        var isInView = (elemBottom <= docViewBottom) && (elemTop >= docViewTop);

        //console.log('isInView ' + isInView + ' docViewTop=' + docViewTop + ' docViewBottom=' + docViewBottom + 
        //' elemTop=' + elemTop + ' elemBottom=' + elemBottom);

        return isInView;
    }

    w.ddd = ddd;
    ddd.config = window._ddd_config;
    delete window._ddd_config;

    ruto
        .config({
        before: function(path, name) {
            ddd.hideAllViews();
            var view = $('#view-' + name);
            $(view).removeClass('hidden');
            ddd.prevView = ddd.currentView;
            ddd.currentView = name;
        },
        notfound: function() {
            ruto.go('/');
        }
    })
        .add('/', 'home', function(path) {
        ddd.feed.showSelection();
    })
        .add('/about', 'about')
        .add('/settings', 'settings')
        .add('/login', 'login')
        .add('/login_submit', function(path) {
        ddd.login.attempt_login();
    })
        .add(/^\/feed\/(\d+)$/i, 'feed', function(path, id) {
        ddd.feed.render(id);
    })
        .add(/^\/feed\/(\w+)$/i, 'feed', function(path, name) {
        if (name === "starred") id = -1;
        else if (name === "published") id = -2;
        else if (name === "fresh") id = -3;
        else if (name === "all") id = -4;
        else if (name === "recent") id = -6;
        ddd.feed.render(id);
    })
        .add(/^\/article\/(\d+)\/(\d+)$/i, 'article', function(path, id, index) {
        ddd.article.render(id, index - 1);
    });
};
//XXX TEMPLATES HERE
if (!dddns['poll']) {
    var poll = function() {
        if (dddns['ddd-plat'] && dddns['ddd'] && dddns['lib']) {
            console.log('everything is loaded');
            dddns['ddd'](window);
            dddns['ddd-plat'](window);
            dddns['poll'] = 1;
        } else {
            setTimeout(dddns['poll'], 75);
        }
    };
    dddns['poll'] = poll;
    setTimeout(poll, 75);
}
;dddns = typeof dddns === 'undefined' ? {} : dddns;
dddns['ddd-plat'] = function(w) {
    console.log('dddd');
    var d = w.document,
        body = d.body,
        flipWise = {
            clockwise: ['flip-out-to-left', 'flip-in-from-left'],
            anticlockwise: ['flip-out-to-right', 'flip-in-from-right']
        },
        flip = function(opts) {
            var inEl = opts. in ,
                outEl = opts.out,
                //inClass = inEl.classList,
                //outClass = outEl.classList,
                direction = opts.direction,
                fn = opts.fn,
                wise = flipWise[direction],
                reset = function() {
                    $(inEl).off('webkitAnimationEnd', reset, false);
                    //body.classList.remove('viewport-flip');
                    $(outEl).addClass('hidden');
                    $(inEl).removeClass('flip');
                    $(outEl).removeClass('flip');
                    $(outEl).removeClass(wise[0]);
                    $(inEl).removeClass(wise[1]);
                    if (fn) fn.apply();
                };
            //body.classList.add('viewport-flip');
            $(inEl).removeClass('hidden');
            $(outEl).addClass('flip');
            $(inEl).addClass('flip');
            $(inEl).on('webkitAnimationEnd', reset, false);
            $(outEl).addClass(wise[0]);
            $(inEl).addClass(wise[1]);
        },
        slideWise = {
            rtl: ['slide-out-to-left', 'slide-in-from-right'],
            ltr: ['slide-out-to-right', 'slide-in-from-left']
        },
        slide = function(opts) {
            var inEl = opts. in ,
                outEl = opts.out,
                //inClass = inEl.classList,
                //outClass = outEl.classList,
                //inHeader = inEl.getElementsByTagName('header')[0],
                //outHeader = outEl.getElementsByTagName('header')[0],
                //inHeaderClass = inHeader.classList,
                //outHeaderClass = outHeader.classList,
                direction = opts.direction,
                fn = opts.fn,
                wise = slideWise[direction],
                reset = function() {
                    $(inEl).off('webkitAnimationEnd', reset, false);
                    $(outEl).addClass('hidden');
                    $(inEl).removeClass('sliding');
                    $(outEl).removeClass('sliding');
                    $(outEl).removeClass(wise[0]);
                    $(inEl).removeClass(wise[1]);
                    //inHeaderClass.remove('transparent');
                    //outHeaderClass.remove('transparent');
                    if (fn) fn.apply();
                };
            $(inEl).removeClass('hidden');
            $(outEl).addClass('sliding');
            $(inEl).addClass('sliding');
            $(inEl).on('webkitAnimationEnd', reset, false);
            $(outEl).addClass(wise[0]);
            $(inEl).addClass(wise[1]);

            //inHeaderClass.add('transparent');
            //outHeaderClass.add('transparent');
        },
        getScreenState = function() {
            return w.innerWidth >= 640 ? 'wide' : 'narrow';
        };

    // Disable user scale of the viewport
    var vmeta = d.querySelector('meta[name=viewport]');
    if (!vmeta) {
        vmeta = d.createElement('meta');
        vmeta.name = 'viewport';
        d.head.appendChild(vmeta);
    }
    vmeta.content = 'width=device-width, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=1.0';

    console.log('hi');
    // Apply iOS < 6 styles, only for iPhone/iPod
    var ua = navigator.userAgent,
        isIPhoneIPod = ua && /iPhone|iPod/.test(ua),
        isIOS5 = parseInt((ua.match(/ OS (\d+)_/i) || [, 0])[1], 10) < 6;
    if (isIPhoneIPod && isIOS5) $(body).addClass('ios5');
    console.log('hi2');

    // Wide screen state
    var isWideScreen = getScreenState() == 'wide';
    w.addEventListener('resize', function() {
        var wide = getScreenState() == 'wide';
        if (wide != isWideScreen) {
            isWideScreen = wide;
            location.reload();
        }
    });

    // Inject some elements for additional iOS decorations
    body.insertAdjacentHTML('beforeend', isWideScreen ? '<div id="overlay" class="hide"></div>' : '<header class="fake"></header>');

    ruto.config({
        before: function(path, name, matches) {
            console.log('ddd path=' + path + ' name=' + name + ' matches=', matches);
            var currentView = ddd.currentView;
            var hideAllViews = ddd.hideAllViews;
            switch (name) {
                case 'home':
                    var view = $('#view-home');
                    if (!isWideScreen) {
                        if (!currentView) {
                            hideAllViews();
                            view.removeClass('hidden');
                        } else if (currentView == 'about') {
                            flip({ in : view,
                                out: $('#view-' + currentView),
                                direction: 'anticlockwise'
                            });
                        } else if (currentView != 'home') {
                            slide({ in : view,
                                out: $('#view-' + currentView),
                                direction: 'ltr'
                            });
                        }
                    } else {
                        hideAllViews();
                        $('#overlay').addClass('hide');
                        view.removeClass('hidden');
                        var viewComments = $('#view-feed');
                        viewComments.removeClass('hidden');
                        viewComments.find('section').html('<div class="view-blank-state"><div class="view-blank-state-text">No Feed Selected.</div></div>');
                        viewComments.find('header h1').innerHTML = '';
                        viewComments.find('header a.header-back-button').css('display', 'none');
                        ddd.feeds.currentID = null;
                        ddd.pub('selectCurrentStory');
                    }
                    ddd.currentView = 'home';
                    break;
                case 'about':
                    var view = $('#view-about');
                    if (!isWideScreen) {
                        if (!currentView) {
                            hideAllViews();
                            view.removeClass('hidden');
                        } else if (currentView != 'about') {
                            flip({ in : view,
                                out: $('#view-home'),
                                direction: 'clockwise'
                            });
                        }
                    } else {
                        view.removeClass('hidden');
                        $('#view-home').removeClass('hidden');
                        $('#view-comments').removeClass('hidden');
                        setTimeout(function() {
                            $('#overlay').removeClass('hide');
                        }, 1);
                    }
                    ddd.currentView = 'about';
                    break;
                case 'login':
                    console.log('LOGIN screen!!!!!!!!!!!!');
                    $('#overlay').removeClass('hide');
                    var view = $('#view-login');
                    if (!isWideScreen) {
                        if (!currentView) {
                            hideAllViews();
                            view.removeClass('hidden');
                        } else if (currentView != 'login') {
                            flip({ in : view,
                                out: $('#view-home'),
                                direction: 'clockwise'
                            });
                        }
                    } else {
                        view.removeClass('hidden');
                        $('#view-home').removeClass('hidden');
                        $('#view-comments').removeClass('hidden');
                        setTimeout(function() {
                            $('#overlay').removeClass('hide');
                        }, 1);
                    }
                    ddd.currentView = 'login';
                    break;
                case 'feed':
                    var view = $('#view-feed');
                    if (!isWideScreen) {
                        if (!currentView) {
                            hideAllViews();
                            view.removeClass('hidden');
                        } else if (currentView != 'feed') {
                            // Scroll to top first then slide, prevent Flash of Unscrolled View (FOUV)
                            var id = matches[1];
                            if (id && ddd.feeds.currentID != id) view.find('section').scrollTop = 0;
                            slide({ in : view,
                                out: $('#view-' + currentView),
                                direction: 'rtl'
                            });
                        }
                    } else {
                        hideAllViews();
                        $('#overlay').addClass('hide');
                        view.removeClass('hidden');
                        $('#view-home').removeClass('hidden');
                        ddd.pub('selectCurrentStory', matches[1]);
                        view.find('header a.header-back-button').css('display', '');
                    }
                    ddd.currentView = 'feed';
                    break;
                case 'article':
                    var view = $('#view-article');
                    if (!isWideScreen) {
                        if (!currentView) {
                            hideAllViews();
                            view.removeClass('hidden');
                        } else if (currentView != 'article') {
                            // Scroll to top first then slide, prevent Flash of Unscrolled View (FOUV)
                            var id = matches[1];
                            if (id && ddd.feeds.currentID != id) view.find('section').scrollTop = 0;
                            slide({ in : view,
                                out: $('#view-' + currentView),
                                direction: 'rtl'
                            });
                        }
                    } else {
                        hideAllViews();
                        $('#overlay').addClass('hide');
                        view.removeClass('hidden');
                        $('#view-home').removeClass('hidden');
                        ddd.pub('selectCurrentStory', matches[1]);
                        view.find('header a.header-back-button').css('display', '');
                    }
                    ddd.currentView = 'article';
                    break;
            }
        }
    });

    // Remember scroll tops of each views
    w.addEventListener('pagehide', function() {
        var views = $('.view'),
            hackerScrollTops = {};
        for (var i = 0, l = views.length; i < l; i++) {
            var view = views[i];
            hackerScrollTops[view.id] = view.querySelector('.scroll section').scrollTop || 0;
        }
        amplify.store('hacker-scrolltops', hackerScrollTops);
    }, false);
    var restoreScrollTops = function() {
        var hackerScrollTops = amplify.store('hacker-scrolltops');
        setTimeout(function() {
            for (var id in hackerScrollTops) {
                $('#' + id).querySelector('.scroll section').scrollTop = hackerScrollTops[id];
            }
        }, 1);
    };
    w.addEventListener('pageshow', restoreScrollTops, false);
    restoreScrollTops();

    // Instantly hide address bar when start tapping the scroll area
    if (isIPhoneIPod) {
        var $viewSections = d.querySelectorAll('.view>.scroll'),
            wInnerHeight = null;
        Array.prototype.forEach.call($viewSections, function(view) {
            view.addEventListener('touchstart', function() {
                if (w.innerHeight != wInnerHeight) {
                    w.scrollTo(0, 0);
                    if (isIOS5) {
                        var div = d.createElement('div');
                        div.style.height = '600px';
                        body.appendChild(div);
                        setTimeout(function() {
                            body.removeChild(div);
                        }, 100);
                    }
                    wInnerHeight = w.innerHeight;
                }
            }, false);
        });
    }

    tappable('.view>header a.header-button[href]', {
        noScroll: true,
        onTap: function(e, target) {
            var hash = target.hash;
            // The close button in 'About' view
            if (isWideScreen && /about/i.test(ruto.current) && hash == '#/') {
                ruto.back('/');
            } else {
                location.hash = hash;
            }
        }
    });

    tappable('#view-home-refresh', {
        noScroll: true,
        onTap: ddd.feeds.reload
    });

    var scrollingToTop = false;
    tappable('.view>header h1', {
        onTap: function(e, target) {
            var section = target.parentNode.nextElementSibling.firstElementChild;
            if (section.scrollTop == 0 || scrollingToTop) {
                if (isIPhoneIPod) {
                    // Show address bar
                    var oriHeight = body.style.height;
                    body.style.height = '100%';
                    setTimeout(function() {
                        body.style.height = oriHeight;
                    }, 100);
                }
            } else {
                // Scroll the section to top
                // Reset the overflow because the momentum ignores scrollTop setting
                if (scrollingToTop) return;
                scrollingToTop = true;
                var originalOverflow = section.style.overflow;
                section.style.overflow = 'hidden';
                setTimeout(function() {
                    section.style.overflow = originalOverflow;
                    var raf;
                    var tween = new TWEEN.Tween({
                        scrollTop: section.scrollTop
                    })
                        .to({
                        scrollTop: 0
                    }, 300)
                        .easing(TWEEN.Easing.Cubic.InOut)
                        .onUpdate(function() {
                        section.scrollTop = this.scrollTop;
                    })
                        .onComplete(function() {
                        cancelAnimationFrame(raf);
                        tween.stop(); // Removes the tween object
                        scrollingToTop = false;
                        delete tween;
                    })
                        .start();
                    var step = function() {
                        TWEEN.update();
                        requestAnimationFrame(step);
                    };
                    raf = requestAnimationFrame(step);
                }, 200);
            }
        }
    });

    // iPad-specific code for selected items in the list
    // When you tap on an item and drag, selected item will be deselected
    // When drag is done, previous selected item will be re-selected
    var listTappedDelay;
    tappable('#view-home .tableview-links li>a:first-child', {
        allowClick: !isWideScreen,
        activeClassDelay: 100,
        inactiveClassDelay: isWideScreen ? 100 : 1000,
        onStart: function(e, target) {
            if (isWideScreen) {
                var ul = target.parentNode;
                if (ul) {
                    ul = ul.parentNode;
                    listTappedDelay = setTimeout(function() {
                        if (ul) $(ul).addClass('list-tapped');
                    }, 100);
                }
            }
        },
        onMove: function() {
            if (!isWideScreen) return;
            clearTimeout(listTappedDelay);
        },
        onEnd: function(e, target) {
            if (!isWideScreen) return;
            clearTimeout(listTappedDelay);
            var ul = target.parentNode.parentNode;
            setTimeout(function() {
                if (ul) $(ul).removeClass('list-tapped');
            }, 100);
        },
        onTap: function(e, target) {
            if (target.classList.contains('more-link')) {
                ddd.news.more(target);
            } else if (/^#\//.test(target.getAttribute('href'))) { // "local" links
                location.hash = target.hash;
            } else if (target.href && isWideScreen) {
                w.open(target.href);
            }
        }
    });

    tappable('#view-about .grouped-tableview-links li>a:first-child', {
        allowClick: true,
        activeClassDelay: 100,
        inactiveClassDelay: 1000
    });

    tappable('#view-home .tableview-links li>a.detail-disclosure-button', {
        noScroll: true,
        noScrollDelay: 100,
        onTap: function(e, target) {
            location.hash = target.hash;
        }
    });

    tappable('button.comments-toggle', function(e, target) {
        ddd.comments.toggle(target);
    });

    tappable('section.comments li>a.more-link', function(e, target) {
        ddd.comments.more(target);
    });

    tappable('#login ', function(e, target) {
        ddd.login.doLogin();
    });

    //tappable('#view-comments .load-error button', ddd.comments.reload);

    ddd.sub('selectCurrentStory', function(id) {
        console.log('on selectCurrentStory ' + id + ' widescreen=' + isWideScreen);
        if (!isWideScreen) return;
        if (!id) id = (location.hash.match(/feed\/(\d+)/) || [, ''])[1];
        var homeView = $('#view-home');
        var selectedLinks = homeView.find('a[href].selected');
        for (var i = 0, l = selectedLinks.length; i < l; i++) {
            $(selectedLinks[i]).removeClass('selected');
        }
        // If there's no ID, still clear the selected link
        if (!id) return;
        var link = homeView.find('a[href*="feed/' + id + '"]');
        console.log('link is', link);
        if (link.length > 0) {
            $(link).addClass('selected');
            setTimeout(function() {
                link[0].scrollIntoViewIfNeeded ? link[0].scrollIntoViewIfNeeded() : link[0].scrollIntoView();
            }, 1);
        }
    });
    ddd.sub('onRenderNews', function() {
        ddd.pub('selectCurrentStory');
    });

    // Auto-reload news for some specific situations...
    w.addEventListener('pageshow', function() {
        setTimeout(function() {
            if (ddd.currentView == 'home' && $('#feedslist') && !amplify.store('ddd-cached')) {
                ddd.news.reload();
            }
        }, 1);
    }, false);

    // Adjust comments view min-height, a little higher than the scroll area
    // so that it's scrollable. Else, the whole page will scroll instead, which is rather 'ugly'.
    var adjustCommentsSection = function() {
        var viewSection = d.querySelector('#view-comments section');
        if (!viewSection) return;
        var postContentSection = viewSection.querySelector('.post-content');
        var commentsSection = viewSection.querySelector('.comments');
        if (!commentsSection) return;
        var minHeight = viewSection.offsetHeight - postContentSection.offsetHeight + 1;
        var style = $('#comment-section-style');
        if (!style) {
            style = d.createElement('style');
            style.id = 'comment-section-style';
            d.head.appendChild(style);
        }
        style.textContent = '.view section.comments{min-height: ' + minHeight + 'px;}';
    };
    ddd.sub('onRenderComments', function() {
        setTimeout(adjustCommentsSection, isWideScreen ? 1 : 360); // >350ms, which is the sliding animation duration
    });
    w.addEventListener('resize', adjustCommentsSection, false);
    w.addEventListener('orientationchange', adjustCommentsSection, false);

    // Some useful tips from http://24ways.org/2011/raising-the-bar-on-mobile
    var supportOrientation = typeof w.orientation != 'undefined',
        getScrollTop = function() {
            return w.pageYOffset || d.compatMode === 'CSS1Compat' && d.documentElement.scrollTop || body.scrollTop || 0;
        },
        scrollTop = function() {
            if (!supportOrientation) return;
            body.style.height = screen.height + 'px';
            setTimeout(function() {
                w.scrollTo(0, 0);
                body.style.height = w.innerHeight + 'px';
            }, 1);
        };
    if (!isWideScreen) {
        if (d.readyState == 'complete') {
            scrollTop();
        } else {
            w.addEventListener('load', scrollTop, false);
        }
        if (supportOrientation) w.onorientationchange = scrollTop;

        setTimeout(function() {
            var loader = $('#apploader');
            if (!loader) return;
            loader.addClass('hide');
            loader.on('webkitTransitionEnd', function() {
                loader.remove();
            }, false);
        }, 200);
    } else {
        var loader = $('#apploader');
        loader.remove();
    }

    //ddd.news.options.disclosure = !isWideScreen;
    ddd.init();
    ddd.feeds.render();
};
if (!dddns['poll']) {
    var poll = function() {
        if (dddns['ddd-plat'] && dddns['ddd'] && dddns['lib']) {
            // everything is loaded
            console.log('everything is loaded');
            dddns['ddd'](window);
            dddns['ddd-plat'](window);
            dddns['poll'] = 1;
        } else {
            setTimeout(dddns['poll'], 75);
        }
    };
    dddns['poll'] = poll;
    setTimeout(poll, 75);
}
