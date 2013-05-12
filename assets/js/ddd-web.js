dddns = typeof dddns === 'undefined' ? {} : dddns;
dddns.dddPlat = function(w) {
  var d = w.document,
    body = d.body,
    scrollTops = {},
    scrollTimeout,
    getScrollTop = function() {
      return w.pageYOffset || d.compatMode === 'CSS1Compat' && d.documentElement.scrollTop || body.scrollTop || 0;
    },
    saveScrollTop = function() {
      scrollTops[location.hash.slice(1)] = getScrollTop();
    };
  w.addEventListener('scroll', function() {
    // debouncing scrolls
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(saveScrollTop, 500);
  }, false);
  ruto.config({
    on: function() {
      var hash = location.hash.slice(1);
      w.scrollTo(0, scrollTops[hash] || 0);
      scrollTops[hash] = getScrollTop();
    }
  });

  // Adjust min-height on the views based on the viewport
  // While waiting for viewport units to be more widely supported by modern browsers
  var head = d.head || d.getElementsByTagName('head')[0];
  var adjustViewsHeight = function() {
    var vh = window.innerHeight;
    var style = $('#view-height');
    if (!style) {
      style = d.createElement('style');
      style.id = 'view-height';
      head.appendChild(style);
    }
    style.textContent = '.view>.scroll{min-height: ' + (vh * 0.85) + 'px}';
  };

  w.addEventListener('resize', adjustViewsHeight, false);
  w.addEventListener('orientationchange', adjustViewsHeight, false);
  adjustViewsHeight();

  //$('#view-home .more-link').on('click', function() {
  //ddd.feeds.moreFeeds(target);
  //});
  $('#view-feed').on('click', function(e) {
    if (!e.target.classList.contains('more-link')) return;
    ddd.feeds.more(e.target);
  });
  $('#view-home').on('click', function(e) {
    if (e.target.localName !== 'li') return;
    ddd.cmd_click_feed(e.target);
  });
  $('body').on('keydown', function(e) {
    if (e.target.getAttribute('id') !== 'add-feed') return;
    if (e.keyCode === 13)
      ddd.feeds.addFeedClicked();
    if (e.keyCode === 27)
      ddd.feeds.addFeedClicked(true);
  });
  $('#view-login').on('keydown', function(e) {
    if (e.target.localName !== 'input') return;
    if (e.keyCode === 13)
      ddd.login.doLogin();
  });
  $('#view-login').on('click', function(e) {
    if (e.target.getAttribute('id') !== 'login') return;
    ddd.login.doLogin();
  });
  $('#view-home').on('click', function(e) {
    if (!e.target.classList.contains('delete')) return;
    ddd.feeds.removeFeedsInline(false);
  });
  $('#view-home').on('click', function(e) {
    if (!e.target.classList.contains('cancel')) return;
    ddd.feeds.removeFeedsInline(true);
  });

  var addKeyboardShortcuts = function() {
    Mousetrap.bind('j', function() {
      ddd.cmd_move_sel(1);
      return false;
    });
    Mousetrap.bind('k', function() {
      ddd.cmd_move_sel(-1);
      return false;
    });
    Mousetrap.bind('enter', function() {
      ddd.cmd_enter();
      return false;
    });
    Mousetrap.bind('i', function() {
      ddd.cmd_goUp();
      return false;
    });
    Mousetrap.bind('o', function() {
      ddd.cmd_open();
      return false;
    });
    Mousetrap.bind('A', function() {
      ddd.feeds.markAllRead();
      return false;
    });
    Mousetrap.bind('g r', function() {
      ddd.feeds.reload(true);
      return false;
    });
    Mousetrap.bind('+', function() {
      ddd.feeds.addFeed();
      return false;
    });
    Mousetrap.bind('d d', function() {
      //ddd.feeds.removeFeed();
      ddd.feeds.removeFeedInline();
      return false;
    });
    Mousetrap.bind('shift+j', function() {
      ddd.article.cmd_next(1);
      return false;
    });
    Mousetrap.bind('shift+k', function() {
      ddd.article.cmd_next(-1);
      return false;
    });
    Mousetrap.bind('shift+n', function() {
      ddd.article.cmd_markUnread();
      return false;
    });
    Mousetrap.bind('l', function() {
      ddd.feeds.cmd_toggleUnread();
      return false;
    });
    Mousetrap.bind('f', function() {
      if (ddd.currentView !== 'article') return true;
      decorateLinks();
      return false;
    });
    Mousetrap.bind('s', function() {
      ddd.feeds.cmd_toggleStar();
      return false;
    });
    Mousetrap.bind('g l', function() {
      ddd.logout();
      return false;
    });
    Mousetrap.bind('?', function() {
      ruto.go('/about');
      return false;
    });
  };

  var addDialogKeys = function() {
    Mousetrap.bind('escape', function() {
      ddd.feeds.escapePressed();
      return false;
    });
  };

  ddd.sub('onDialog', function() {
    Mousetrap.reset();
    addDialogKeys();
  });
  ddd.sub('onDialogDone', function() {
    Mousetrap.reset();
    addKeyboardShortcuts();
  });

  addKeyboardShortcuts();
  ddd.init();

  var decorateLinks = function() {
    LinkHints.activateModeToOpenInNewTab();
  };
};

var poll = function() {
  if (window._ddd_config) {
    console.log('everything is loaded');
    dddns.ddd(window);
    dddns.dddPlat(window);
    dddns.poll = 1;
  } else {
    setTimeout(dddns.poll, 75);
  }
};
dddns.poll = poll;
setTimeout(poll, 75);
