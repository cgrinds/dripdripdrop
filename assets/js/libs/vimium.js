// Decorate links extracted with love from Vimium
var KeyboardUtils, root;

KeyboardUtils = {
  keyCodes: {
    ESC: 27,
    backspace: 8,
    deleteKey: 46,
    enter: 13,
    space: 32,
    shiftKey: 16,
    f1: 112,
    f12: 123,
    tab: 9
  },
  keyNames: {
    37: "left",
    38: "up",
    39: "right",
    40: "down"
  },
  keyIdentifierCorrectionMap: {
    "U+00C0": ["U+0060", "U+007E"],
    "U+00BD": ["U+002D", "U+005F"],
    "U+00BB": ["U+003D", "U+002B"],
    "U+00DB": ["U+005B", "U+007B"],
    "U+00DD": ["U+005D", "U+007D"],
    "U+00DC": ["U+005C", "U+007C"],
    "U+00BA": ["U+003B", "U+003A"],
    "U+00DE": ["U+0027", "U+0022"],
    "U+00BC": ["U+002C", "U+003C"],
    "U+00BE": ["U+002E", "U+003E"],
    "U+00BF": ["U+002F", "U+003F"]
  },
  init: function() {
    if (navigator.userAgent.indexOf("Mac") !== -1) {
      this.platform = "Mac";
    } else if (navigator.userAgent.indexOf("Linux") !== -1) {
      this.platform = "Linux";
    } else {
      this.platform = "Windows";
    }
    return this.platform;
  },
  getKeyChar: function(event) {
    var character, correctedIdentifiers, keyIdentifier, unicodeKeyInHex;
    if (typeof event.keyIdentifier === 'undefined') {
      if (this.keyNames[event.keyCode]) {
        return this.keyNames[event.keyCode];
      }
      if (event.keyCode >= this.keyCodes.f1 && event.keyCode <= this.keyCodes.f12) {
        return "f" + (1 + event.keyCode - keyCodes.f1);
      }
      character = String.fromCharCode(parseInt(event.keyCode, 10)).toLowerCase();
      if (event.shiftKey) {
        return character.toUpperCase();
      } else {
        return character;
      }
    }
    if (event.keyIdentifier.slice(0, 2) !== "U+") {
      if (this.keyNames[event.keyCode]) {
        return this.keyNames[event.keyCode];
      }
      if (event.keyCode >= this.keyCodes.f1 && event.keyCode <= this.keyCodes.f12) {
        return "f" + (1 + event.keyCode - keyCodes.f1);
      }
      return "";
    }
    keyIdentifier = event.keyIdentifier;
    if ((this.platform === "Windows" || this.platform === "Linux") && this.keyIdentifierCorrectionMap[keyIdentifier]) {
      correctedIdentifiers = this.keyIdentifierCorrectionMap[keyIdentifier];
      keyIdentifier = event.shiftKey ? correctedIdentifiers[1] : correctedIdentifiers[0];
    }
    unicodeKeyInHex = "0x" + keyIdentifier.substring(2);
    character = String.fromCharCode(parseInt(unicodeKeyInHex, 16)).toLowerCase();
    if (event.shiftKey) {
      return character.toUpperCase();
    } else {
      return character;
    }
  },
  isPrimaryModifierKey: function(event) {
    if (this.platform === "Mac") {
      return event.metaKey;
    } else {
      return event.ctrlKey;
    }
  },
  isEscape: function(event) {
    return (event.keyCode === this.keyCodes.ESC) || (event.ctrlKey && this.getKeyChar(event) === '[');
  }
};

KeyboardUtils.init();

root = typeof exports !== "undefined" && exports !== null ? exports : window;

root.KeyboardUtils = KeyboardUtils;

root.keyCodes = KeyboardUtils.keyCodes;
    
KeyboardUtils.dddKeys = function(e) {
        var keyChar = KeyboardUtils.getKeyChar(e).toLowerCase();
        if(keyChar === 'i' || keyChar === 'o') {
          LinkHints.deactivateMode(0); 
          return true;
        }
        if(keyChar === 'j') return true;
        if(keyChar === 'k') return true;
        return false;
      };

      //onKeypress = function(e) {
        //if(KeyboardUtils.dddKeys(e)) return false;
        //var ret = handlerStack.bubbleEvent('keypress', e);
        //console.log('onKP ret', ret);
        //return ret;
      //};

      var onKeydown = function(e) {
        if(ddd.currentView !== 'article') return;
        //console.log('onKD', e);
        if(KeyboardUtils.dddKeys(e)) return false;
        var ret = handlerStack.bubbleEvent('keydown', e);
        return ret;
      };

      var onKeyup = function(e) {
        if(ddd.currentView !== 'article') return;
        if(KeyboardUtils.dddKeys(e)) return false;
        var ret = handlerStack.bubbleEvent('keyup', e);
        //console.log('onKUP ret', ret);
        return ret;
      };

      document.addEventListener("keydown", onKeydown, true);
      //document.addEventListener("keypress", onKeypress, true);
      document.addEventListener("keyup", onKeyup, true);

      var DomUtils, root;

      DomUtils = {
        addElementList: function(els, overlayOptions) {
          var el, parent, _i, _len;

          parent = document.createElement("div");
          if (overlayOptions.id !== null) {
            parent.id = overlayOptions.id;
          }
          if (overlayOptions.className !== null) {
            parent.className = overlayOptions.className;
          }
          for (_i = 0, _len = els.length; _i < _len; _i++) {
            el = els[_i];
            parent.appendChild(el);
          }
          document.documentElement.appendChild(parent);
          return parent;
        },
        removeElement: function(el) {
          return el.parentNode.removeChild(el);
        },
        makeXPath: function(elementArray) {
          var i, xpath;

          xpath = [];
          for (i in elementArray) {
            xpath.push("//" + elementArray[i], "//xhtml:" + elementArray[i]);
          }
          return xpath.join(" | ");
        },
        evaluateXPath: function(xpath, resultType) {
          var namespaceResolver;

          namespaceResolver = function(namespace) {
            if (namespace === "xhtml") {
              return "http://www.w3.org/1999/xhtml";
            } else {
              return null;
            }
          };
          return document.evaluate(xpath, document.documentElement, namespaceResolver, resultType, null);
        },
        getVisibleClientRect: function(element) {
          var child, childClientRect, clientRect, clientRects, computedStyle, _i, _j, _k, _len, _len1, _len2, _ref;

          clientRects = element.getClientRects();
          for (_i = 0, _len = clientRects.length; _i < _len; _i++) {
            clientRect = clientRects[_i];
            if (clientRect.top < -2 || clientRect.top >= window.innerHeight - 4 || clientRect.left < -2 || clientRect.left >= window.innerWidth - 4) {
              continue;
            }
            if (clientRect.width < 3 || clientRect.height < 3) {
              continue;
            }
            computedStyle = window.getComputedStyle(element, null);
            if (computedStyle.getPropertyValue('visibility') !== 'visible' || computedStyle.getPropertyValue('display') === 'none' || computedStyle.getPropertyValue('opacity') === '0') {
              continue;
            }
            return clientRect;
          }
          for (_j = 0, _len1 = clientRects.length; _j < _len1; _j++) {
            clientRect = clientRects[_j];
            if (clientRect.width === 0 || clientRect.height === 0) {
              _ref = element.children;
              for (_k = 0, _len2 = _ref.length; _k < _len2; _k++) {
                child = _ref[_k];
                computedStyle = window.getComputedStyle(child, null);
                if (computedStyle.getPropertyValue('float') === 'none' && computedStyle.getPropertyValue('position') !== 'absolute') {
                  continue;
                }
                childClientRect = this.getVisibleClientRect(child);
                if (childClientRect === null) {
                  continue;
                }
                return childClientRect;
              }
            }
          }
          return null;
        },
        isSelectable: function(element) {
          var selectableTypes;

          selectableTypes = ["search", "text", "password"];
          return (element.nodeName.toLowerCase() === "input" && selectableTypes.indexOf(element.type) >= 0) || element.nodeName.toLowerCase() === "textarea";
        },
        simulateSelect: function(element) {
          element.focus();
          return element.setSelectionRange(element.value.length, element.value.length);
        },
        simulateClick: function(element, modifiers) {
          if($.browser.firefox) {
            element.setAttribute('target', '_blank');
            element.click();
            return;
          } 
          var event, eventSequence, mouseEvent, _i, _len, _results;

          modifiers || (modifiers = {});
          eventSequence = ["mouseover", "mousedown", "mouseup", "click"];
          _results = [];
          for (_i = 0, _len = eventSequence.length; _i < _len; _i++) {
            event = eventSequence[_i];
            mouseEvent = document.createEvent("MouseEvents");
            mouseEvent.initMouseEvent(event, true, true, window, 1, 0, 0, 0, 0, modifiers.ctrlKey, false, false, modifiers.metaKey, 0, null);
            _results.push(element.dispatchEvent(mouseEvent));
          }
          return _results;
        },
        flashRect: function(rect) {
          var flashEl;

          flashEl = document.createElement("div");
          flashEl.id = "vimiumFlash";
          flashEl.className = "vimiumReset";
          flashEl.style.left = rect.left + window.scrollX + "px";
          flashEl.style.top = rect.top + window.scrollY + "px";
          flashEl.style.width = rect.width + "px";
          flashEl.style.height = rect.height + "px";
          document.documentElement.appendChild(flashEl);
          return setTimeout((function() {
            return DomUtils.removeElement(flashEl);
          }), 400);
        },
        suppressEvent: function(event) {
          event.preventDefault();
          return event.stopPropagation();
        }
      };

      root = typeof exports !== "undefined" && exports !== null ? exports : window;

      root.DomUtils = DomUtils;

      var LinkHints, OPEN_IN_NEW_TAB, alphabetHints, filterHints, numberToHintString, root, spanWrap;

      OPEN_IN_NEW_TAB = {};

var settings;

settings = {
  values: {},
  loadedValues: 0,
  isLoaded: false,
  eventListeners: {},
  init: function() {
  },
  get: function(key) {
    return this.values[key];
  },
  set: function(key, value) {
    this.values[key] = value;
  },
};

var root;

root = typeof exports !== "undefined" && exports !== null ? exports : window;

root.HandlerStack = (function() {
  function HandlerStack() {
    this.stack = [];
    this.counter = 0;
  }

  HandlerStack.prototype.genId = function() {
    return this.counter = ++this.counter & 0xffff;
  };

  HandlerStack.prototype.push = function(handler) {
    handler.id = this.genId();
    this.stack.push(handler);
    return handler.id;
  };

  HandlerStack.prototype.bubbleEvent = function(type, event) {
    var handler, i, passThrough, _i, _ref;

    for (i = _i = _ref = this.stack.length - 1; _i >= 0; i = _i += -1) {
      handler = this.stack[i];
      if (handler && handler[type]) {
        this.currentId = handler.id;
        passThrough = handler[type].call(this, event);
        if (!passThrough) {
          DomUtils.suppressEvent(event);
          return false;
        }
      }
    }
    return true;
  };

  HandlerStack.prototype.remove = function(id) {
    var handler, i, _i, _ref, _results;

    if (id == null) {
      id = this.currentId;
    }
    _results = [];
    for (i = _i = _ref = this.stack.length - 1; _i >= 0; i = _i += -1) {
      handler = this.stack[i];
      if (handler.id === id) {
        this.stack.splice(i, 1);
        break;
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };
  return HandlerStack;
})();

  window.handlerStack = new HandlerStack();

  //settings.set('linkHintCharacters', 'sadfjklewcmpgh');
  // modify to not conflict with ddd article shortcuts
  settings.set('linkHintCharacters', 'sdvghlewcmpghu');
     
  LinkHints = {
    hintMarkerContainingDiv: null,
    mode: void 0,
    linkActivator: void 0,
    delayMode: false,
    markerMatcher: void 0,
    isActive: false,
    init: function() {
      return this.markerMatcher = settings.get("filterLinkHints") ? filterHints : alphabetHints;
    },
    clickableElementsXPath: DomUtils.makeXPath(["a", "area[@href]", "textarea", "button", "select", "input[not(@type='hidden' or @disabled or @readonly)]", "*[@onclick or @tabindex or @role='link' or @role='button' or contains(@class, 'button') or " + "@contenteditable='' or translate(@contenteditable, 'TRUE', 'true')='true']"]),
    activateModeToOpenInNewTab: function() {
      return this.activateMode(OPEN_IN_NEW_TAB);
    },
    activateMode: function(mode) {
      var el, hintMarkers;

      if (mode == null) {
        mode = OPEN_IN_NEW_TAB;
      }
      if (!document.documentElement) {
        return;
      }
      if (this.isActive) {
        return;
      }
      this.isActive = true;
      this.setOpenLinkMode(mode);
      hintMarkers = this.markerMatcher.fillInMarkers((function() {
        var _i, _len, _ref, _results;

        _ref = this.getVisibleClickableElements();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          el = _ref[_i];
          _results.push(this.createMarkerFor(el));
        }
        return _results;
      }).call(this));
      this.hintMarkerContainingDiv = DomUtils.addElementList(hintMarkers, {
        id: "vimiumHintMarkerContainer",
        className: "vimiumReset"
      });
      return this.handlerId = handlerStack.push({
        keydown: this.onKeyDownInMode.bind(this, hintMarkers),
        keypress: function() {
          return false;
        },
        keyup: function() {
          return false;
        }
      });
    },
    setOpenLinkMode: function(mode) {
      this.mode = mode;
      if (this.mode === OPEN_IN_NEW_TAB) {
        return this.linkActivator = function(link) {
          return DomUtils.simulateClick(link, {
            metaKey: KeyboardUtils.platform === "Mac",
            ctrlKey: KeyboardUtils.platform !== "Mac"
          });
        };
      }
    },
    shouldCreateMarker: function(ele) {
      if (ele.classList.contains('header-button')) return false;
      if (ele.localName === 'button') {
        if(ele.parentElement.classList.contains('header-button')) return false;
      }
      if(ele.getAttribute('id') === 'full_article') return false;
      return true;
    },

    createMarkerFor: function(link) {
      var clientRect, marker;

      marker = document.createElement("div");
      marker.className = "vimiumReset internalVimiumHintMarker vimiumHintMarker";
      marker.clickableItem = link.element;
      clientRect = link.rect;
      marker.style.left = clientRect.left + window.scrollX + "px";
      marker.style.top = clientRect.top - 15 + window.scrollY + "px";
      marker.rect = link.rect;
      return marker;
    },
    getVisibleClickableElements: function() {
      var c, clientRect, coords, element, i, img, imgClientRects, map, rect, resultSet, visibleElements, _i, _ref;

      resultSet = DomUtils.evaluateXPath(this.clickableElementsXPath, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
      visibleElements = [];
      for (i = _i = 0, _ref = resultSet.snapshotLength; _i < _ref; i = _i += 1) {
        element = resultSet.snapshotItem(i);
        clientRect = DomUtils.getVisibleClientRect(element, clientRect);
        if (LinkHints.shouldCreateMarker(element) && clientRect !== null) {
          visibleElements.push({
            element: element,
            rect: clientRect
          });
        }
        if (element.localName === "area") {
          map = element.parentElement;
          if (!map) {
            continue;
          }
          img = document.querySelector("img[usemap='#" + map.getAttribute("name") + "']");
          if (!img) {
            continue;
          }
          imgClientRects = img.getClientRects();
          if (imgClientRects.length === 0) {
            continue;
          }
          c = element.coords.split(/,/);
          coords = [parseInt(c[0], 10), parseInt(c[1], 10), parseInt(c[2], 10), parseInt(c[3], 10)];
          rect = {
            top: imgClientRects[0].top + coords[1],
            left: imgClientRects[0].left + coords[0],
            right: imgClientRects[0].left + coords[2],
            bottom: imgClientRects[0].top + coords[3],
            width: coords[2] - coords[0],
            height: coords[3] - coords[1]
          };
          visibleElements.push({
            element: element,
            rect: rect
          });
        }
      }
      return visibleElements;
    },
    onKeyDownInMode: function(hintMarkers, event) {
      var delay, keyResult, linksMatched, marker, matched, prev_mode, _i, _j, _len, _len1, _ref,
        _this = this;

      if (this.delayMode) {
        return;
      }
      //if (event.keyCode === keyCodes.shiftKey && this.mode !== COPY_LINK_URL) {
        //prev_mode = this.mode;
        //this.setOpenLinkMode(OPEN_IN_NEW_TAB);
        //handlerStack.push({
          //keyup: function(event) {
            //if (event.keyCode !== keyCodes.shiftKey) {
              //return;
            //}
            //if (_this.isActive) {
              //_this.setOpenLinkMode(prev_mode);
            //}
            //return _this.remove();
          //}
        //});
      //}
      if (KeyboardUtils.isEscape(event)) {
        this.deactivateMode();
      } else if (event.keyCode !== keyCodes.shiftKey) {
        keyResult = this.markerMatcher.matchHintsByKey(hintMarkers, event);
        linksMatched = keyResult.linksMatched;
        delay = (_ref = keyResult.delay) != null ? _ref : 0;
        if (linksMatched.length === 0) {
          this.deactivateMode();
        } else if (linksMatched.length === 1) {
          this.activateLink(linksMatched[0], delay);
        } else {
          for (_i = 0, _len = hintMarkers.length; _i < _len; _i++) {
            marker = hintMarkers[_i];
            this.hideMarker(marker);
          }
          for (_j = 0, _len1 = linksMatched.length; _j < _len1; _j++) {
            matched = linksMatched[_j];
            this.showMarker(matched, this.markerMatcher.hintKeystrokeQueue.length);
          }
        }
      }
      return false;
    },
    activateLink: function(matchedLink, delay) {
      var clickEl;

      this.delayMode = true;
      clickEl = matchedLink.clickableItem;
      if (DomUtils.isSelectable(clickEl)) {
        DomUtils.simulateSelect(clickEl);
        return this.deactivateMode(delay, function() {
          return LinkHints.delayMode = false;
        });
      } else {
        if (clickEl.nodeName.toLowerCase() === "input" && clickEl.type !== "button") {
          clickEl.focus();
        }
        DomUtils.flashRect(matchedLink.rect);
        this.linkActivator(clickEl);
        return this.deactivateMode(delay, function() {
          return LinkHints.delayMode = false;
        });
      }
    },
    showMarker: function(linkMarker, matchingCharCount) {
      var j, _i, _ref, _results;

      linkMarker.style.display = "";
      _results = [];
      for (j = _i = 0, _ref = linkMarker.childNodes.length; 0 <= _ref ? _i < _ref : _i > _ref; j = 0 <= _ref ? ++_i : --_i) {
        if (j < matchingCharCount) {
          _results.push(linkMarker.childNodes[j].classList.add("matchingCharacter"));
        } else {
          _results.push(linkMarker.childNodes[j].classList.remove("matchingCharacter"));
        }
      }
      return _results;
    },
    hideMarker: function(linkMarker) {
      return linkMarker.style.display = "none";
    },
    deactivateMode: function(delay, callback) {
      var deactivate,
        _this = this;
      deactivate = function() {
        if (LinkHints.markerMatcher.deactivate) {
          LinkHints.markerMatcher.deactivate();
        }
        if (LinkHints.hintMarkerContainingDiv) {
          DomUtils.removeElement(LinkHints.hintMarkerContainingDiv);
        }
        LinkHints.hintMarkerContainingDiv = null;
        handlerStack.remove(_this.handlerId);
        return _this.isActive = false;
      };
      if (!delay) {
        deactivate();
        if (callback) {
          return callback();
        }
      } else {
        return setTimeout(function() {
          deactivate();
          if (callback) {
            return callback();
          }
        }, delay);
      }
    }
  };

      alphabetHints = {
        hintKeystrokeQueue: [],
        logXOfBase: function(x, base) {
          return Math.log(x) / Math.log(base);
        },
        fillInMarkers: function(hintMarkers) {
          var hintStrings, idx, marker, _i, _len;

          hintStrings = this.hintStrings(hintMarkers.length);
          for (idx = _i = 0, _len = hintMarkers.length; _i < _len; idx = ++_i) {
            marker = hintMarkers[idx];
            marker.hintString = hintStrings[idx];
            marker.innerHTML = spanWrap(marker.hintString.toUpperCase());
          }
          return hintMarkers;
        },
        hintStrings: function(linkCount) {
          var digitsNeeded, hintStrings, i, linkHintCharacters, longHintCount, shortHintCount, start, _i, _j, _ref;

          linkHintCharacters = settings.get("linkHintCharacters");
          digitsNeeded = Math.ceil(this.logXOfBase(linkCount, linkHintCharacters.length));
          shortHintCount = Math.floor((Math.pow(linkHintCharacters.length, digitsNeeded) - linkCount) / linkHintCharacters.length);
          longHintCount = linkCount - shortHintCount;
          hintStrings = [];
          if (digitsNeeded > 1) {
            for (i = _i = 0; 0 <= shortHintCount ? _i < shortHintCount : _i > shortHintCount; i = 0 <= shortHintCount ? ++_i : --_i) {
              hintStrings.push(numberToHintString(i, linkHintCharacters, digitsNeeded - 1));
            }
          }
          start = shortHintCount * linkHintCharacters.length;
          for (i = _j = start, _ref = start + longHintCount; start <= _ref ? _j < _ref : _j > _ref; i = start <= _ref ? ++_j : --_j) {
            hintStrings.push(numberToHintString(i, linkHintCharacters, digitsNeeded));
          }
          return this.shuffleHints(hintStrings, linkHintCharacters.length);
        },
        shuffleHints: function(hints, characterSetLength) {
          var bucket, buckets, hint, i, result, _i, _j, _len, _len1;

          buckets = (function() {
            var _i, _results;

            _results = [];
            for (i = _i = 0; _i < characterSetLength; i = _i += 1) {
              _results.push([]);
            }
            return _results;
          })();
          for (i = _i = 0, _len = hints.length; _i < _len; i = ++_i) {
            hint = hints[i];
            buckets[i % buckets.length].push(hint);
          }
          result = [];
          for (_j = 0, _len1 = buckets.length; _j < _len1; _j++) {
            bucket = buckets[_j];
            result = result.concat(bucket);
          }
          return result;
        },
        matchHintsByKey: function(hintMarkers, event) {
          var keyChar, linksMatched, matchString;

          keyChar = KeyboardUtils.getKeyChar(event).toLowerCase();
          if (event.keyCode === keyCodes.backspace || event.keyCode === keyCodes.deleteKey) {
            if (!this.hintKeystrokeQueue.pop()) {
              return {
                linksMatched: []
              };
            }
          } else if (keyChar) {
            this.hintKeystrokeQueue.push(keyChar);
          }
          matchString = this.hintKeystrokeQueue.join("");
          linksMatched = hintMarkers.filter(function(linkMarker) {
            return linkMarker.hintString.indexOf(matchString) === 0;
          });
          return {
            linksMatched: linksMatched
          };
        },
        deactivate: function() {
          return this.hintKeystrokeQueue = [];
        }
      };

      filterHints = {
        hintKeystrokeQueue: [],
        linkTextKeystrokeQueue: [],
        labelMap: {},
        generateLabelMap: function() {
          var forElement, label, labelText, labels, _i, _len, _results;

          labels = document.querySelectorAll("label");
          _results = [];
          for (_i = 0, _len = labels.length; _i < _len; _i++) {
            label = labels[_i];
            forElement = label.getAttribute("for");
            if (forElement) {
              labelText = label.textContent.trim();
              if (labelText[labelText.length - 1] === ":") {
                labelText = labelText.substr(0, labelText.length - 1);
              }
              _results.push(this.labelMap[forElement] = labelText);
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        },
        generateHintString: function(linkHintNumber) {
          return (numberToHintString(linkHintNumber + 1, settings.get("linkHintNumbers"))).toUpperCase();
        },
        generateLinkText: function(element) {
          var linkText, nodeName, showLinkText;

          linkText = "";
          showLinkText = false;
          nodeName = element.nodeName.toLowerCase();
          if (nodeName === "input") {
            if (this.labelMap[element.id]) {
              linkText = this.labelMap[element.id];
              showLinkText = true;
            } else if (element.type !== "password") {
              linkText = element.value;
              if (!linkText && 'placeholder' in element) {
                linkText = element.placeholder;
              }
            }
          } else if (nodeName === "a" && !element.textContent.trim() && element.firstElementChild && element.firstElementChild.nodeName.toLowerCase() === "img") {
            linkText = element.firstElementChild.alt || element.firstElementChild.title;
            if (linkText) {
              showLinkText = true;
            }
          } else {
            linkText = element.textContent || element.innerHTML;
          }
          return {
            text: linkText,
            show: showLinkText
          };
        },
        renderMarker: function(marker) {
          return marker.innerHTML = spanWrap(marker.hintString + (marker.showLinkText ? ": " + marker.linkText : ""));
        },
        fillInMarkers: function(hintMarkers) {
          var idx, linkTextObject, marker, _i, _len;

          this.generateLabelMap();
          for (idx = _i = 0, _len = hintMarkers.length; _i < _len; idx = ++_i) {
            marker = hintMarkers[idx];
            marker.hintString = this.generateHintString(idx);
            linkTextObject = this.generateLinkText(marker.clickableItem);
            marker.linkText = linkTextObject.text;
            marker.showLinkText = linkTextObject.show;
            this.renderMarker(marker);
          }
          return hintMarkers;
        },
        matchHintsByKey: function(hintMarkers, event) {
          var delay, keyChar, linksMatched, marker, matchString, userIsTypingLinkText, _i, _len;

          keyChar = KeyboardUtils.getKeyChar(event);
          delay = 0;
          userIsTypingLinkText = false;
          if (event.keyCode === keyCodes.enter) {
            for (_i = 0, _len = hintMarkers.length; _i < _len; _i++) {
              marker = hintMarkers[_i];
              if (marker.style.display !== "none") {
                return {
                  linksMatched: [marker]
                };
              }
            }
          } else if (event.keyCode === keyCodes.backspace || event.keyCode === keyCodes.deleteKey) {
            if (!this.hintKeystrokeQueue.pop() && !this.linkTextKeystrokeQueue.pop()) {
              return {
                linksMatched: []
              };
            }
          } else if (keyChar) {
            if (settings.get("linkHintNumbers").indexOf(keyChar) >= 0) {
              this.hintKeystrokeQueue.push(keyChar);
            } else {
              this.hintKeystrokeQueue = [];
              this.linkTextKeystrokeQueue.push(keyChar);
              userIsTypingLinkText = true;
            }
          }
          linksMatched = this.filterLinkHints(hintMarkers);
          matchString = this.hintKeystrokeQueue.join("");
          linksMatched = linksMatched.filter(function(linkMarker) {
            return !linkMarker.filtered && linkMarker.hintString.indexOf(matchString) === 0;
          });
          if (linksMatched.length === 1 && userIsTypingLinkText) {
            delay = 200;
          }
          return {
            linksMatched: linksMatched,
            delay: delay
          };
        },
        filterLinkHints: function(hintMarkers) {
          var linkMarker, linkSearchString, linksMatched, matchedLink, oldHintString, _i, _len;

          linksMatched = [];
          linkSearchString = this.linkTextKeystrokeQueue.join("");
          for (_i = 0, _len = hintMarkers.length; _i < _len; _i++) {
            linkMarker = hintMarkers[_i];
            matchedLink = linkMarker.linkText.toLowerCase().indexOf(linkSearchString.toLowerCase()) >= 0;
            if (!matchedLink) {
              linkMarker.filtered = true;
            } else {
              linkMarker.filtered = false;
              oldHintString = linkMarker.hintString;
              linkMarker.hintString = this.generateHintString(linksMatched.length);
              if (linkMarker.hintString !== oldHintString) {
                this.renderMarker(linkMarker);
              }
              linksMatched.push(linkMarker);
            }
          }
          return linksMatched;
        },
        deactivate: function() {
          this.hintKeystrokeQueue = [];
          this.linkTextKeystrokeQueue = [];
          return this.labelMap = {};
        }
      };

      spanWrap = function(hintString) {
        var char, innerHTML, _i, _len;

        innerHTML = [];
        for (_i = 0, _len = hintString.length; _i < _len; _i++) {
          char = hintString[_i];
          innerHTML.push("<span class='vimiumReset'>" + char + "</span>");
        }
        return innerHTML.join("");
      };

      numberToHintString = function(number, characterSet, numHintDigits) {
        var base, hintString, hintStringLength, i, remainder, _i, _ref;

        if (numHintDigits == null) {
          numHintDigits = 0;
        }
        base = characterSet.length;
        hintString = [];
        remainder = 0;
        while (true) {
          remainder = number % base;
          hintString.unshift(characterSet[remainder]);
          number -= remainder;
          number /= Math.floor(base);
          if (!(number > 0)) {
            break;
          }
        }
        hintStringLength = hintString.length;
        for (i = _i = 0, _ref = numHintDigits - hintStringLength; _i < _ref; i = _i += 1) {
          hintString.unshift(characterSet[0]);
        }
        return hintString.join("");
      };
root = typeof exports !== "undefined" && exports !== null ? exports : window;
root.LinkHints = LinkHints;
LinkHints.init.bind(LinkHints)();

