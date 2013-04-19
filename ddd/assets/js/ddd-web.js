dddns = typeof dddns === 'undefined' ? {} : dddns;
dddns['ddd-plat'] = function(w) {
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
        var style = $('view-height');
        if (!style) {
            style = d.createElement('style');
            style.id = 'view-height';
            head.appendChild(style);
        }
        style.textContent = '.view>.scroll{min-height: ' + (vh * 0.85) + 'px}';
    };

    //var rewriteLinks = function(e) {
    //console.log('click on ', e);
    //if(!e) return;
    //var onArticle = /article/.test(window.location.href);
    //if(!onArticle) return;
    //var ele = e.target || e.srcElement;
    //if(ele.tagName == 'A') {
    //ele.setAttribute('target', '_blank');
    //}
    //};
    //w.addEventListener('click', rewriteLinks, false);

    w.addEventListener('resize', adjustViewsHeight, false);
    w.addEventListener('orientationchange', adjustViewsHeight, false);
    adjustViewsHeight();

    $('#view-home-settings').on('click', function(e, target) {
        ddd.feeds.settings();
    });
    $('#view-home .more-link').on('click', function(e, target) {
        ddd.feeds.moreFeeds(target);
    });
    $('#view-feed').on('click', '.more-link', function(e) {
        ddd.feeds.more(e.target);
    });
    $('#feedslist').on('click', 'li', function(e) {
        ddd.cmd_click_feed(e.target);
    });
    $('body').on('keydown', '#add-feed', function(e) {
        //console.log(e.keyCode, e);
        if (e.keyCode === 13)
            ddd.feeds.addFeedClicked();
        if (e.keyCode === 27)
            ddd.feeds.addFeedClicked(true);
    });
    $('#view-login').on('keydown', 'input', function(e) {
        if (e.keyCode === 13)
            ddd.login.doLogin();
    });
    $('#view-home').on('click', '.question .delete', function(e) {
        ddd.feeds.removeFeedsInline(false);
    });
    $('#view-home').on('click', '.question .cancel', function(e) {
        ddd.feeds.removeFeedsInline(true);
    });

    //ibento('#view-home .delete', 'click', function(e, target) {
    //ddd.feeds.removeFeeds(false);
    //});
    //ibento('#view-home .cancel', 'click', function(e, target) {
    //ddd.feeds.removeFeeds(true);
    //});

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
    };

    var addDialogKeys = function() {
        Mousetrap.bind('escape', function() {
            ddd.feeds.escapePressed();
            return false;
        });
        //Mousetrap.bind('shift+n', function() {
        //ddd.article.cmd_markUnread();
        //return false;
        //});

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
