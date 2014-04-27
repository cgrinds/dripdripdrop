/*globals Element:true, NodeList:true*/
$ = (function(document, ua, $) {
  var element = Element.prototype,
    nodeList = NodeList.prototype,
    forEach = 'forEach',
    trigger = 'trigger',
    each = [][forEach],
    dummy = document.createElement('div'), // Firefox requires a valid tag
    specialEvents = {};

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents';

  nodeList[forEach] = each;

  element.on = function(event, fn) {
    this.addEventListener(event, fn, false);
    return this;
  };

  nodeList.on = function(event, fn) {
    each.call(this, function(el) {
      el.on(event, fn);
    });
    return this;
  };

  element.trigger = function(type, data) {
    var event = document.createEvent(specialEvents[type] || 'Events'),
      bubbles = true;
    event.initEvent(type, true, true);
    event.data = data || {};
    event.eventName = type;
    event.target = this;
    this.dispatchEvent(event);
    return this;
  };

  nodeList.trigger = function(event) {
    each.call(this, function(el) {
      el[trigger](event);
    });
    return this;
  };

  $ = function(s) {
    //console.log('$ for ',s);
    var r = document.querySelectorAll(s || '☺'),
      length = r.length;
    return length == 1 ? r[0] : !length ? [] : r;
  };

  $all = function(s) {
    var r = document.querySelectorAll(s || '☺'),
      length = r.length;
    return !length ? [] : r;
  }

  $.on = element.on.bind(dummy);
  $.trigger = element[trigger].bind(dummy);

  $.ajax = function(args) {
    var xhr = new XMLHttpRequest(),
      type = args.type,
      url = args.url,
      success = args.success,
      opts = {},
      error = args.error,
      fd;

    //if (typeof opts === 'function') {
    //callback = opts;
    //opts = null;
    //}

    xhr.open(type, url);

    if (type === 'POST' && opts) {
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      //fd = new FormData();
      //for (var key in opts) {
      //fd.append(key, JSON.stringify(opts[key]));
      //}
    }

    xhr.onload = function() {
      success(JSON.parse(xhr.response));
    };
    xhr.onerror = xhr.onabort = xhr.ontimeout = function(e) {
      error(e);
    };

    //xhr.send(opts ? fd : null);
    xhr.send(args.data ? args.data : null);
  };

  function detect(ua) {
    var browser = this.browser = {},
      chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
      firefox = ua.match(/Firefox\/([\d.]+)/);

    if (chrome) {
      browser.chrome = true;
      browser.version = chrome[1];
    }
    if (firefox) {
      browser.firefox = true;
      browser.version = firefox[1];
    }
  }
  detect.call($, ua);
  return $;
})(document, navigator.userAgent);

