dddns = typeof dddns === 'undefined' ? {} : dddns;
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
            $(target).addClass('loading');
            var feed_id = ddd.feeds.currentID;
            if (!feed_id) return;
            var unread_only = amplify.store('view-mode');
            var skipBy = ddd.feeds.skip;
            if(ddd.feed.currentHeadlines) {
              skipBy = ddd.feed.currentHeadlines.length;
            }
            
            msg = {
                op: "getHeadlines",
                feed_id: "" + feed_id,
                show_content: "true",
                view_mode: unread_only ? "unread" : "",
                skip: "" + skipBy,
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
                var html = ddd.feeds.markupHeadlines(data, skipBy + 1);
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
            var moreOnPage = $('.more-link').length > 0;
            var html = '<ul class="tableview tableview-links" id="dddlist">' +
                ddd.feeds.markupHeadlines(data) +
                (moreOnPage || data.length >= ddd.config.ARTICLE_LIMIT ?
                '<li><a class="more-link">More&hellip;<span class="loader"></span></a></li>' : '') +
                '</ul>';
            if (!moreOnPage && data.length >= ddd.config.ARTICLE_LIMIT) {
                var next = ddd.feeds.skip;
                if (!next) next = 0;
                ddd.feeds.skip = next + ddd.config.ARTICLE_LIMIT;
                console.log('increase skip to', ddd.feeds.skip)
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
            var sel = ddd.getSel('feed');
            var unread_only = amplify.store('view-mode');
            if(dir == 1) {
                // the article we're looking at has already been removed from currentHeadlines
                // so its size has decreased by 1
                if(!unread_only) {
                  sel.sel++;
                }
                var next_sel = sel.sel;
                var items = $(sel.siz);
                if(next_sel >= items.length) return;
                var as = $(items[next_sel]).find('a');
                if (!as || as.length === 0) return;
                var link = $(as[0]);
                if(link.hasClass('more-link')) {
                  // click this link per normal but reset the sel since the more link replaces itself
                  // if you don't you'll skip the next article
                  if(!unread_only) {
                    sel.sel--;
                  }
                }
                link.click();
            } else {
              sel.sel--;
              if(sel.sel < 0) {
                sel.sel = 0;
                return;
              }
              if(!unread_only) {
              }
              var prev_sel = sel.sel;
              var items = $(sel.siz);
              if(prev_sel < 0) return;
              var as = $(items[prev_sel]).find('a');
              if (!as || as.length === 0) return;
              var link = $(as[0]);
              if(link.hasClass('more-link')) {
                // click this link per normal but reset the sel since the more link replaces itself
                // if you don't you'll skip the next article
                if(!unread_only) {
                  sel.sel--;
                }
              }
              link.click();
            }
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
            // instead of ruto.back() use this since if you view multiple articles via Shift-J up doesnt
            // really do what you want
            if(!ddd.feeds.currentID) return;
            ruto.go('/feed/' + ddd.feeds.currentID);
            return;
        }
        ruto.go('/')
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
