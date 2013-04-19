dddns = typeof dddns === 'undefined' ? {} : dddns;
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
