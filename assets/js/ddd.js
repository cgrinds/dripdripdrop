window.dddns = typeof dddns === 'undefined' ? {} : dddns;
dddns.ddd = function(w) {
  var d = w.document;

  if (typeof TEMPLATES === 'undefined') {
    dddns.TF(Hogan.Template);
  }

  // amplify is global so ddd-ios can see it
  window.amplify = {
    db: {},
    store: function(key, value) {
      var json;
      if ( value === undefined ) {
        if(key === 'feeds-by-id') {
          return amplify.db['feeds-by-id'];
        }
        json = localStorage.getItem(key);
        if (json) {
          return JSON.parse(json).data;
        }
        return undefined;
      }
      if (value === null) {
				localStorage.removeItem(key);
        return; 
      }
      if(key === 'feeds-by-id') {
        amplify.db['feeds-by-id'] = value;
        return;
      }
      json = JSON.stringify({data: value});
      localStorage.setItem(key, json);
    },
  };

  var pubsubCache = {};
  var ddd = {
    pollRetries: 0,
    totalUnread: 0,
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
    prevHref: null,
    currentView: null,
    hideAllViews: function() {
      var views = d.querySelectorAll('.view');
      for (var i = 0, l = views.length; i < l; i++) {
        views[i].classList.add('hidden');
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
      var left = list.slice(0, index),
        right = list.slice(index + 1, list.length);
      left.push.apply(left, right);
      return left;
    },

    pollServer: function() {
      if (typeof ddd.config.refresh_every === 'undefined' || !ddd.config.refresh_every) return;
      if (ddd.config.refresh_every <= 0) return;
      if (ddd.pollTimer) {
        window.clearTimeout(ddd.pollTimer);
      }
      // every x minutes
      ddd.pollTimer = window.setTimeout(ddd.pollRefresh, 1000 * 60 * ddd.config.refresh_every);
      ddd.pollRetries = 0;
    },

    pollServerError: function() {
      //exponential back off
      ddd.pollRetries = ddd.pollRetries + 1;
      var milliMinutes = 1000 * 60 * ddd.config.refresh_every;
      ddd.pollTimer = window.setTimeout(ddd.pollRefresh, Math.pow(2, ddd.pollRetries) * milliMinutes);
    },

    pollRefresh: function() {
      var currentDate = new Date();
      var msg = "Poll at " + currentDate.getFullYear() + "/" + (currentDate.getMonth() + 1) + "/" + currentDate.getDate() + " " + currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
      console.log(msg);
      ddd.feeds.reload(true);
    },

    logout: function() {
      ['feeds', 'feeds-by-id', 'feeds-sid', 'apiLevel', 'settings'].forEach(function(key) {
        localStorage.removeItem(key);
      });
      ruto.go('/login');
      ddd.login.render();
    },

    setFav: function(total) {
      if (!ddd.settings.showBadge) return;
      if (total < 0) total = 0;
      ddd.totalUnread = total;
      if(typeof Tinycon !== 'undefined') Tinycon.setBubble(total);
    },

    deltaFav: function(delta) {
      if (!ddd.settings.showBadge) return;
      ddd.setFav(ddd.totalUnread - delta);
    }
  };

  var timeout = 20000; // 20 seconds timeout

  var ttrss = {
    api: function(msg, success, error) {
      if (!success) success = function() {};
      if (!error) error = function() {};

      var onsuccess = function(data) {
        var response = data;
        console.log('<- ', response);
        //console.log(JSON.stringify(response));
        if (response && !response.error) {
          if (response.content) {
            var loginError = 'error' in response.content;
            if (loginError) {
              if (/login/i.test(window.location.href)) {
                return error(response.content);
              } else {
                amplify.store('feeds-sid', null); // remove from store
                ruto.go("/login");
                ddd.login.render();
              }
            }
          }
          success(response.content);
        } else {
          error(response);
        }
      };

      var onerror = function(e) {
        console.log('*- ', e);
        error(JSON.parse(JSON.stringify(e)));
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
    },
  };

  var $homeScroll = d.querySelector('#view-home .scroll'),
    $homeScrollSection = $homeScroll.querySelector('section'),
    loadingFeeds = false,
    loadingHeadlines = false,
    selections = {},
    tmpl = ddd.tmpl,
    platform = "Mac";

  ddd.feeds = {
    skip: 0,
    skipFeeds: 0,
    specialIdToName: {
      1: "starred",
      2: "published",
      3: "fresh",
      4: "all",
      6: "recent",
    },
    specialNameToId: {
      "starred": -1,
      "published": -2,
      "fresh": -3,
      "all": -4,
      "recent": -6,
    },

    markupFeed: function(feed) {
      var tmpl1 = tmpl('feeds'),
        tmpl2 = tmpl('feed-partial'),
        hasIcon = feed.has_icon && ddd.config.iconPath,
        vars = {feed: feed};

      feed.type = feed.unread > 0 ? "unread" : "read";
      if (feed.title === "") feed.title = "&nbsp;";
      if (feed.id < 0) {
        feed.urlid = ddd.feeds.specialIdToName[-feed.id];
      }
      if (hasIcon) vars.icon = ddd.config.iconPath;

      return tmpl1.render(vars, {
        feed_partial: tmpl2
      });
    },

    markupHeadline: function(article) {
      var vars = {
        article: article
      };
      if (ddd.feeds.currentID < 0 && ddd.config.iconPath) {
        // show icon of feed when reading special feed
        var feedsById = amplify.store('feeds-by-id');
        //debug code remove
        if (feedsById) {
          var feed = feedsById[article.feed_id];
          if (feed && feed.has_icon) {
            vars.icon = ddd.config.iconPath;
            vars.feed_id = article.feed_id;
          }
        }
      }
      article.url = '#/article/' + article.id;
      article.type = article.unread ? "unread" : "read";
      return tmpl('headline', vars);
    },

    markupEach: function(data, i, markup) {
      var html = '';
      if (!i) i = 1;
      data.forEach(function(item) {
        item.i = i++;
        html += markup(item);
      });
      return html;
    },

    feedsAndMore: function(data, i) {
      var html = ddd.feeds.markupEach(data, i, ddd.feeds.markupFeed),
        next;
      html += data.length >= ddd.config.FEED_LIMIT ?
        '<li><a class="more-link">More&hellip;<span class="loader"></span></a></li>' : '';

      if (data.length >= ddd.config.FEED_LIMIT) {
        next = ddd.feeds.skipFeeds;
        if (!next) next = 0;
        ddd.feeds.skipFeeds = next + ddd.config.FEED_LIMIT;
      }
      return html;
    },

    render: function(opts) {
      if (loadingFeeds) return;
      if (!opts) opts = {};
      var feeds = amplify.store('feeds');
      var tmpl1 = tmpl('feeds-load');

      var loadFeeds = function(_data) {
        var data = _data.slice();
        var html = '<ul class="tableview tableview-links" id="feedslist">' +
          ddd.feeds.feedsAndMore(data) + '</ul>';
        $homeScrollSection.innerHTML = html;
        ddd.feed.showSelection();
        ddd.pub('onRenderNews');
      };

      if (feeds) {
        loadFeeds(feeds);
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
        var unreadOnly = ddd.viewMode.isUnreadOnly();
        var cat = ddd.settings.show_special_folders ? "-4" : "-3";
        var msg = {
          op: "getFeeds",
          cat_id: cat,
          unread_only: "" + unreadOnly,
        };
        //if(ddd.config.FEED_LIMIT) msg['limit'] = "" + ddd.config.FEED_LIMIT;

        ttrss.api(msg, function(data) {
          loadingFeeds = false;
          if (!data || data.error) {
            showError();
            return;
          }
          var byId = {};
          var total = 0;
          for (var i = 0, l = data.length; i < l; i++) {
            var item = data[i];
            item.index = i;
            byId[item.id] = item;
            if (typeof item.unread === 'string')
              item.unread = parseInt(item.unread, 10);
            // an unread count that does not get decremented
            // used to update favicon when marking a feed read
            item.u = item.unread;
            if (item.id > 0)
              total += item.unread;
          }
          ddd.setFav(total);
          amplify.store('feeds', data);
          amplify.store('feeds-by-id', byId);
          loadFeeds(data);
          ddd.pollServer();
        }, function(e) {
          loadingFeeds = false;
          showError();
          ddd.pollServerError();
        });
      }
    },

    moreFeeds: function(target) {
      target.classList.add('loading');

      var showError = function() {
        var tmpl1 = tmpl('feeds-load');

        var html = tmpl1.render({
          load_error: true
        }),
          ele = target,
          parent = ele.parentNode,
          tempDiv = document.createElement('div');

        tempDiv.innerHTML = html;
        parent.replaceChild(tempDiv.childNodes[0], ele);
        ddd.pub('logAPIError', 'news');
      };

      var unreadOnly = ddd.viewMode.isUnreadOnly(),
        cat = ddd.settings.show_special_folders ? "-4" : "-3";
      var msg = {
        op: "getFeeds",
        cat_id: cat,
        unread_only: "" + unreadOnly,
        limit: "" + ddd.config.FEED_LIMIT,
        offset: "" + ddd.feeds.skipFeeds,
      };
      ttrss.api(msg, function(data) {
        loadingFeeds = false;
        target.classList.remove('loading');
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
        var total = 0;
        for (var i = 0, l = data.length; i < l; i++) {
          var item = data[i];
          // sigh, special feeds return unread as a string instead of an int
          if (item.id < 0)
            item.unread = parseInt(item.unread, 10);
          else
            total += item.unread;
          // an unread count that does not get decremented
          // used to update favicon when marking a feed read
          item.u = item.unread;
          item.index = i;
          feedsById[item.id] = item;
        }
        setFav(total);
        amplify.store('feeds', list);
        amplify.store('feeds-by-id', feedsById);
        var html = ddd.feeds.feedsAndMore(data, ddd.feeds.skipFeeds + 1);
        $('#feedslist').append(html);
        ddd.feeds.skipFeeds += ddd.config.FEED_LIMIT;
      }, function(e) {
        loadingFeeds = false;
        showError();
      });
    },

    more: function(target) {
      target.classList.add('loading');
      var feed_id = ddd.feeds.currentID,
        unreadOnly = ddd.viewMode.isUnreadOnly(),
        skipBy = ddd.feeds.skip;
        
      if (!feed_id) return;
      if (ddd.feed.currentHeadlines) {
        skipBy = ddd.feed.currentHeadlines.length;
      }

      var msg = {
        op: "getHeadlines",
        feed_id: "" + feed_id,
        show_content: "true",
        view_mode: unreadOnly ? "unread" : "",
        skip: "" + skipBy,
        limit: "" + ddd.config.article_limit,
      };
      if (amplify.store('apiLevel') >= 7) {
        msg.sanitize = false;
      }
      ttrss.api(msg, function(_data) {
        if (ddd.feeds.currentID != feed_id) return;
        target.classList.remove('loading');
        var targetParent = target.parentNode;
        if (!targetParent) return;
        if (targetParent.parentNode) targetParent.parentNode.removeChild(targetParent);
        if (!_data) return;
        var data = _data.slice();
        if (ddd.feed.currentHeadlines) ddd.feed.currentHeadlines.push.apply(ddd.feed.currentHeadlines, data);
        var html = ddd.feeds.markupEach(data, skipBy + 1, ddd.feeds.markupHeadline);
        // do we still need more?
        html += data.length >= ddd.config.article_limit ?
          '<li><a class="more-link">More&hellip;<span class="loader"></span></a></li>' : 
          '</ul>';
        $('#dddlist').insertAdjacentHTML('beforeend', html);
        ddd.feeds.skip += ddd.config.article_limit;
      }, function(e) {});
    },

    reload: function(force) {
      if (force) {
        amplify.store('feeds', null);
        amplify.store('feeds-by-id', null);
        ddd.feeds.render();
      }
    },

    markAllRead: function() {
      var curFeed = ddd.getSelFeed();
      if (!curFeed) return;
      var msg = {
        op: "catchupFeed",
        feed_id: "" + curFeed.id,
      };
      ttrss.api(msg, function() {}, function() {});

      ddd.deltaFav(curFeed.u);
      curFeed.unread = 0;
      ddd.viewMode.markAllRead(curFeed);
      ddd.feed.markFeedRead(curFeed);
      ddd.feed.showSelection();
    },

    escapePressed: function() {
      ddd.feeds.removeFeedsInline(true);
    },

    removeFeedsInline: function(cancel) {
      var feed = ddd.feeds.feedToDelete;
      if (!feed) return;
      ddd.pub('onDialogDone');
      if (!cancel) {
        ddd.feeds.removeFeeds();
      }
      var liEle = $('#feed-' + feed.id),
        html = ddd.feeds.markupFeed(feed),
        parent = liEle.parentNode,
        tempDiv = document.createElement('div');

      tempDiv.innerHTML = html;
      parent.replaceChild(tempDiv.childNodes[0], liEle);
      ddd.feed.showSelection();
    },

    removeFeeds: function() {
      var feed = ddd.feeds.feedToDelete;
      if (!feed) return;
      var msg = {
        op: 'unsubscribeFeed',
        feed_id: "" + feed.id,
      };
      ttrss.api(msg, function(data) {
        var msg = "Feed removed";
        var claz = "good";
        if ('error' in data) {
          msg = "Feed not found";
          claz = "bad";
        } else {
          // remove from cache and UI
          ddd.feeds.removeFromStoreAndUI(feed);
        }
        var ele = $('.msg');
        ['good', 'bad'].forEach(function(w) {
          ele.classList.remove(w);
        });
        ele.classList.add(claz);
        ele.innerHTML = msg;
        ele.style.display = 'block';

        $('#view-home h1').innerHTML = 'Feeds';
        window.setTimeout(function() {
          ele.style.display = 'none';
        }, 3000);
      }, function(data) {
        console.log('unsub err', data);
      });
    },

    removeFeedInline: function() {
      if (ddd.currentView !== 'home') return;
      var sel = ddd.getSel(),
        ele = $all(sel.siz)[sel.sel],
        feed = ddd.getSelFeed();
      if(feed.id < 0) return;
      feed.i = feed.index + 1;
      ddd.feeds.feedToDelete = feed;
      var tmpl1 = tmpl('remove-feed-inline');
      var tmpl2 = tmpl('feed-partial');
      var html = tmpl1.render(feed, {
        feed_partial: tmpl2
      });
      ele.innerHTML = html;
      ddd.pub('onDialog');
    },

    addFeed: function() {
      $('#view-home h1').innerHTML = tmpl('add-feed', {});
    },

    addFeedClicked: function(cancel) {
      if (cancel) {
        $('#view-home h1').innerHTML = 'Feeds';
        return;
      }
      var txt = $('#add-feed').value,
        ele = $('.msg');
        
      if (txt.length === 0) return;

      var msg = {
        op: 'subscribeToFeed',
        feed_url: txt,
      };
      ttrss.api(msg, function(data) {
        var msg = "Feed added",
          claz = "bad",
          status = data.status;
        if (status) {
          var code = status.code,
            err = status.message;
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
        ['good', 'bad'].forEach(function(w) {
          ele.classList.remove(w);
        });
        ele.classList.add(claz);
        ele.innerHTML = msg;
        ele.style.display = 'block';

        if (claz === 'good') {
          $('#view-home h1').innerHTML = 'Feeds';
          window.setTimeout(function() {
            ele.style.display = 'none';
          }, 3000);
        }
      }, function(e) {
        ['good', 'bad'].forEach(function(w) {
          ele.classList.remove(w);
        });
        ele.classList.add('bad');
        ele.innerHTML = 'Error adding feed ';
        ele.style.display = 'block';
      });
    },

    cmd_toggleUnread: function() {
      var feedsById = amplify.store('feeds-by-id'),
        feedID = ddd.feeds.currentID;
      ddd.settings.unread_only = !ddd.settings.unread_only;
      amplify.store('settings', ddd.settings);

      ddd.viewMode = ddd.settings.unread_only ? ddd.vmOnlyUnread : ddd.vmAll;
      if (ddd.currentView === 'feed') {
        ddd.feed.currentHeadlines = null;
        ddd.feed.render(feedID, feedsById[feedID]);
      }
      // unfortunately the feeds need to be reloaded even when looking at headlines
      // otherwise when you go back up ther list of feeds will be wrong
      ddd.feeds.skipFeeds = 0;
      ddd.feeds.reload(true);
    },

    getConfig: function() {
      var msg = {
        op: "getConfig",
      };
      ttrss.api(msg, function(data) {
        for (var i in data) {
          if (data.hasOwnProperty(i)) ddd.config[i] = data[i];
        }
        if ('icons_url' in ddd.config) {
          ddd.config.iconPath = ddd.config.api + ddd.config.icons_url + '/';
          ddd.feeds.render();
        }
      }, function(e) {});
    },

    removeFromStoreAndUI: function(feed) {
      var list = amplify.store('feeds'),
        index = 0,
        i = 0,
        l = list.length,
        map = amplify.store('feeds-by-id'),
        feedli = $('#feed-' + feed.id);

      for (; i < l; i++) {
        if (list[i].id === feed.id) {
          index = i;
          break;
        }
      }
      list = ddd.remove(list, index);
      amplify.store('feeds', list);

      delete map[feed.id];
      amplify.store('feeds-by-id', map);

      if (feedli.length === 0) return;
      feedli.parentNode.removeChild(feedli);
    },

    cmd_toggleStar: function() {
      if (ddd.currentView === 'home') return;
      var article = ddd.article.currentArticle,
        sel = ddd.getSel(),
        curId = ddd.feeds.currentID;
      if (ddd.currentView === 'feed') {
        article = ddd.feed.currentHeadlines[sel.sel];
      }
      if (!article) return;
      article.marked = !article.marked;
      var msg = {
        op          : "updateArticle",
        article_ids : "" + article.id,
        mode        : "2", //toggle
        field       : "0"
      };
      ttrss.api(msg, function() {}, function() {});

      var feedsByMap = amplify.store('feeds-by-id'),
        feed = feedsByMap[curId];
      if (!feed) return;
      if (ddd.currentView === 'article') {
        ddd.feed.renderTitle(feed, '#view-article .meta', article);
      }
      //ddd.pub('onStar', {article: article, feed: feed});
      if (ddd.currentView === "feed") {
        if (curId === -1) {
          if (article.unread)
            ddd.feed.updateFeed(feed, article.marked ? 1 : -1);
        } else {
          var html = ddd.feeds.markupHeadline(article),
            eles = $(sel.siz),
            tempDiv = document.createElement('div');

          if (!eles.length) eles = [eles];
          tempDiv.innerHTML = html;
          var parent = eles[sel.sel].parentNode;
          parent.replaceChild(tempDiv.childNodes[0], eles[sel.sel]);
        }
        ddd.feed.showSelection();
        return;
      }
      // in all cases if the article is unread update starred articles unread count
      if (ddd.settings.show_special_folders) {
        ddd.feeds.updateSpecialCounts();
      }
    },

    updateSpecialCounts: function() {
      var unreadOnly = ddd.viewMode.isUnreadOnly(),
        feedsByMap = amplify.store('feeds-by-id'),
        msg = {
          op: "getFeeds",
          cat_id: -1,
          unread_only: "" + unreadOnly,
        };
      ttrss.api(msg, function(data) {
        if (!data || data.error) {
          $homeScrollSection.innerHTML = tmpl('feeds-load').render({
            load_error: true
          });
          ddd.pub('logAPIError', 'news');
          return;
        }
        for (var i = 0, l = data.length; i < l; i++) {
          var newItem = data[i],
            feed = feedsByMap[newItem.id],
            newUnread = parseInt(newItem.unread, 10);
          if (newUnread != feed.unread) {
            feed.unread = newUnread;
            ddd.feed.replaceFeedUI(feed);
          }
        }
        amplify.store('feeds', data);
        amplify.store('feeds-by-id', feedsByMap);
      });
    },

    commitFeed: function() {
      if(!ddd.feeds.currentID) return;
      var feed = amplify.store('feeds-by-id')[ddd.feeds.currentID];
      if (!feed) return;
      if (feed.unread === 0) {
        ddd.viewMode.markAllRead(feed);
      }
    },
  };

  ddd.feed = {
    currentHeadlines: null,
    renderTitle: function(feed, siz, article) {
      var html,
        hasIcon = feed.has_icon && ddd.config.iconPath,
        feed_icon_id = feed.id,
        feedsById = amplify.store('feeds-by-id'),
        ele = $(siz);
        
      if (feed.id < 0 && article) {
        var realFeed = feedsById[article.feed_id];
        if (realFeed.has_icon && ddd.config.iconPath) {
          hasIcon = true;
          feed_icon_id = realFeed.id;
        }
      }
      if (hasIcon) {
        html = '<img class="fav" src=' + ddd.config.iconPath + feed_icon_id + ".ico>" + feed.title;
      } else {
        html = feed.title;
      }
      if (article && article.marked) {
        html += ' <div class="meta">' + '<a class="header-button header-button-icon header-button-right" id="view-home-settings"><button><i class="icon-star">Star</i></button></a></div>';
      }
      if (!ele.length) ele = [ele];
      ele[0].innerHTML = html;
    },

    render: function(_id, _feed) {
      if (!_id) return;
      var id = parseInt(_id, 10);
      if (ddd.feeds.currentID === id && ddd.feed.currentHeadlines !== null) {
        ddd.feed.showSelection();
        //if (ddd.viewMode.goHomeIfFeedIsEmpty()) return;
        return;
      }
      if (loadingHeadlines) return;

      ddd.feeds.currentID = id;
      ddd.feeds.skip = 0;
      var feed = _feed;
      if (!feed) {
        feed = amplify.store('feeds-by-id')[id];
      }
      if (feed)
        ddd.feed.renderTitle(feed, '#view-feed h1');

      var unreadOnly = ddd.viewMode.isUnreadOnly();
      loadingHeadlines = true;
      $('#view-feed .scroll').innerHTML = tmpl('feeds-load', {
        loading: true
      });

      var msg = {
        op: "getHeadlines",
        feed_id: "" + id,
        show_content: "true",
        view_mode: unreadOnly ? "unread" : "",
        limit: "" + ddd.config.article_limit,
      };
      if (amplify.store('apiLevel') >= 7) {
        msg.sanitize = false;
      }
      ttrss.api(msg, function(data) {
        loadingHeadlines = false;
        if (ddd.feeds.currentID != id) return;
        ddd.feed.renderHeadlines(data);
        ddd.feed.showSelection();
      }, function(e) {
        loadingHeadlines = false;
      });
    },

    showSelection: function(view) {
      var sel = ddd.getSel(view);
      if (sel === undefined) return;
      var items = $all(sel.siz);
      if (items.length === 0) return;
      if (sel.sel >= items.length) {
        // for when you select the last item
        sel.sel = items.length - 1;
        if (sel.sel < 0) sel.sel = 0;
      }
      var item = items[sel.sel];
      if (!item.classList) return;
      item.classList.add('sel');
    },

    renderHeadlines: function(_data) {
      if (!_data) return;
      var data = _data.slice();
      ddd.feed.currentHeadlines = data;
      var moreOnPage = $('.more-link').length > 0;
      var html = '<ul class="tableview tableview-links" id="dddlist">' +
        ddd.feeds.markupEach(data, 0, ddd.feeds.markupHeadline) + 
        (moreOnPage || data.length >= ddd.config.article_limit ?
        '<li><a class="more-link">More&hellip;<span class="loader"></span></a></li>' : '') +
        '</ul>';
      if (!moreOnPage && data.length >= ddd.config.article_limit) {
        var next = ddd.feeds.skip;
        if (!next) next = 0;
        ddd.feeds.skip = next + ddd.config.article_limit;
      }
      $('#view-feed .scroll').innerHTML = html;
      ddd.pub('adjustCommentsSection');
      ddd.pub('onRenderComments');
    },

    /*
     * Adjust the unread count.
     * Render headlines and update home view
     */
    updateFeed: function(feed, count) {
      feed.unread = feed.unread + count;
      ddd.feed.renderHeadlines(ddd.feed.currentHeadlines);
      if (feed.unread <= 0) {
        ddd.feed.markFeedRead(feed);
        return;
      }
      ddd.feed.replaceFeedUI(feed);
    },

    updateArticle: function(article, unread) {
      article.unread = unread;
      var msg = {
        op          : "updateArticle",
        article_ids : "" + article.id,
        mode        : unread ? "1" : "0",
        field       : "2"
      };
      ttrss.api(msg, function() {}, function() {});

      var feedsByMap = amplify.store('feeds-by-id');
      var feed = feedsByMap[ddd.feeds.currentID];
      ddd.feed.updateFeed(feed, unread ? 1 : -1);
    },

    markArticleRead: function(article, index) {
      if (!article) return;
      if (!article.unread) return;
      ddd.feed.updateArticle(article, false);

      // if the current feed is special also update the article's owner feed
      // actually don't this is problematic because updateFeed uses the headlines
      // from special feeds not the parent feed
      //if (ddd.feeds.currentID < 0) {
      //  // only update the owner feed if it's visible
      //  feed = feedsByMap[article.feed_id];
      //  var ele = $('#feed-' + feed.id)
      //  if (ele.length > 0)
      //    ddd.feed.updateFeed(feed, -1);
      //}
    },

    markFeedRead: function(feed) {
      var i = 0,
        unread = $all('#view-feed .unread'),
        l = 0;
      feed.type = "read";
      feed.unread = 0;
      // need to mutate the read/unread state of articles
      if (ddd.feed.currentHeadlines) {
        for (l = ddd.feed.currentHeadlines.length; i < l; i++) {
          ddd.feed.currentHeadlines[i].unread = false;
        }
      }
      for (i = 0, l = unread.length; i < l; i++) {
        unread[i].setAttribute('class', 'read');
      }
      ddd.feed.replaceFeedUI(feed);
    },

    /*
     * This updates the feed in the home view.
     * The read/unread state and # of unread
     */
    replaceFeedUI: function(feed) {
      feed.i = feed.index + 1;
      var html = ddd.feeds.markupFeed(feed),
        ele = $('#feed-' + feed.id),
        parent = ele.parentNode,
        tempDiv = document.createElement('div');

      if (!parent) return;
      tempDiv.innerHTML = html;
      parent.replaceChild(tempDiv.childNodes[0], ele);
    },
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
      $('#view-login .scroll').innerHTML = tmpl1.render({});
    },
    doLogin: function() {
      var msg = {
        op: "login",
        user: $('#username').value,
        password: $('#password').value
      };
      ttrss.api(msg, function(data) {
        // store the sid
        if (data.session_id) {
          amplify.store('feeds-sid', data.session_id);
          amplify.store('apiLevel', data.api_level);
        }
        // emptying the div was the only reliable way to not have the input eat the keyevents
        $('#view-login .scroll').innerHTML = '';
        ruto.go('/');
        ddd.pollRefresh();
        $('#view-home .scroll').focus();
      }, function(fail) {
        console.log('login failed', fail);
        $(".login-error").innerHTML = 'Login failed';
        $(".login-error").classList.remove('hidden');
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
      var feedsByMap = amplify.store('feeds-by-id');
      var feed = feedsByMap[ddd.feeds.currentID];
      ddd.feed.renderTitle(feed, '#view-article h1', article);
      ddd.feed.markArticleRead(article, index);

      article.hasContent = true;
      if (article.updated) {
        article.date = ddd.formatDate(article.updated, true);
      }
      var back = '#/feed/' + article.feed_id;
      if (ddd.settings.show_special_folders) {
        var match = ddd.prevHref.match(/\/feed\/(\w+)$/i);
        if (match) {
          back = '#/feed/' + match[1];
        }
      }
      $('#view-article .header-back-button').setAttribute('href', back);

      var vars = {
        article: article
      };
      if (ddd.feeds.currentID < 0) {
        var parentFeed = feedsByMap[article.feed_id];
        if (parentFeed.has_icon && ddd.config.iconPath)
          vars.icon = ddd.config.iconPath + article.feed_id;
        vars.feed_title = parentFeed.title;
      }

      var tmpl1 = tmpl('article');
      $('#view-article .scroll').innerHTML = tmpl1.render(vars);
    },

    cmd_nextArticle: function(dir) {
      if (ddd.currentView !== 'article') return;
      var sel = ddd.getSel('feed'),
        as, link,
        items = ddd.moveSel(sel, dir);
      if(!items) return;
      as = items[sel.sel].querySelectorAll('a');
      if (!as || as.length === 0) return;
      link = as[0];
      if (link.classList.contains('more-link')) {
        // click this link per normal but reset the sel since the more link replaces itself
        // if you don't you'll skip the next article
        sel.sel--;
      }
      link.click();
    },

    cmd_markUnread: function() {
      if (ddd.currentView === 'home') return;
      var article = ddd.article.currentArticle;
      if (ddd.currentView === 'feed') {
        var sel = ddd.getSel();
        article = ddd.feed.currentHeadlines[sel.sel];
      }
      if (!article) return;
      if (article.unread) return;
      ddd.feed.updateArticle(article, true);
      
      // advance the selection if marking unread from feed view
      if (ddd.currentView === 'feed') {
        ddd.cmd_move_sel(1);
      }

      if (ddd.feeds.currentID < 0) {
        feed = feedsByMap[article.feed_id];
        ddd.feed.updateFeed(feed, 1);
        ddd.feed.showSelection();
      }
    },
  };

  ddd.settingsView = {
    render: function() {
      var settings = ddd.settings,
        showSpecial = $('input[name="show_special_folders"]'),
        showBadge = $('input[name="show_badge"]');

      showSpecial.checked = settings.show_special_folders;
      showBadge.checked = settings.showBadge;
      $('#view-settings .save').on('click', function() {
        settings.show_special_folders = showSpecial.checked;
        settings.showBadge = showBadge.checked;

        amplify.store('settings', settings);
        ruto.go('/');
      });
    },
  };

  ddd.vmAll = {
    markAllRead: function(feed) {
    },
    goHomeIfFeedIsEmpty: function() {
      return false;
    },
    isUnreadOnly: function() {
      return false;
    },
  };

  ddd.vmOnlyUnread = {
    markAllRead: function(feed) {
      ddd.feed.currentHeadlines = [];
      ddd.feeds.removeFromStoreAndUI(feed);
      // if we marked all read from feed or article view go back to top
      if (ddd.currentView !== 'home') ruto.go('/');
    },
    goHomeIfFeedIsEmpty: function() {
      var feed = ddd.getSelFeed(),
        goHome = !feed || feed.unread === 0;
      if (goHome)
        ruto.go('/');
      return goHome;
    },
    isUnreadOnly: function() {
      return true;
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
    ddd.settings = amplify.store('settings');
    if (!ddd.settings) ddd.settings = ddd.config;
    var unreadOnly = ddd.settings.unread_only;
    if (unreadOnly === undefined) {
      ddd.settings.unread_only = true;
      unreadOnly = true;
    }
    if (ddd.settings.showBadge === undefined) ddd.settings.showBadge = true;
    ddd.viewMode = unreadOnly ? ddd.vmOnlyUnread : ddd.vmAll;
    
    ddd.login.render();
    ddd.resetSelections();
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
    var items = $all(sel.siz);
    if (sel.sel < 0 || sel.sel >= items.length) return;
    var as = items[sel.sel].querySelectorAll('a');
    if (!as || as.length === 0) return;
    as = as[0];
    // when you enter feed A, scroll to the last headline, exit and then enter another feed 
    // reset the selection index
    if (ddd.currentView === 'home') {
      var next = as.getAttribute('href');
      if (sel.cur != next) {
        ddd.getSel('feed').sel = 0;
      }
      sel.cur = next;
    }
    as.trigger('click');
  };

  ddd.cmd_goUp = function() {
    if (ddd.currentView === 'home') return;
    if (ddd.currentView === 'article') {
      // when there are no more headlines in a feed it will be removed by this point
      // so go back to the top instead of showing an empty list
      if (ddd.viewMode.goHomeIfFeedIsEmpty()) return;
      // instead of ruto.back() use this since if you view multiple articles via Shift-J up doesnt
      // really do what you want
      if (!ddd.feeds.currentID) return;
      var sel = ddd.getSel('feed');
      // erase current selection and 
      // advance selection to next headline since the headline is not being removed from the UI
      // the erase only needs to happen when viewing all since when viewing unread_only 
      // the headline will be rerendered anyway
      if (!ddd.settings.unread_only) {
        var eles = $all(sel.siz);
        if (sel.sel < eles.length) {
          eles[sel.sel].classList.remove('sel');
        }
      }
      ddd.moveSel(sel, 1);
      if (ddd.feeds.currentID < 0)
        ruto.go('/feed/' + ddd.feeds.specialIdToName[-ddd.feeds.currentID]);
      else
        ruto.go('/feed/' + ddd.feeds.currentID);
      return;
    }
    if (ddd.currentView === 'feed') {
      // when going from feed to feeds clear headlines so if you reenter the same feed again
      // it will request the headlines
      ddd.feed.currentHeadlines = null;
    }
    ruto.go('/');
  };

  ddd.moveSel = function(sel, dir) {
    sel.sel = sel.sel + dir;
    if (sel.sel < 0) {
      sel.sel = 0;
      return null;
    }
    var items = $all(sel.siz);
    sel.items = items;
    if (sel.sel >= items.length) {
      sel.sel = items.length - 1;
      return null;
    }
    if (items.length === 0 || sel.sel >= items.length) return null;
    return items;
  };

  ddd.getSel = function(view) {
    var kind = '';
    if (view !== undefined) {
      kind = view;
    } else {
      if (ddd.currentView === 'home')
        kind = 'feeds';
      else 
        kind = ddd.currentView;
    }
    if (!kind) return undefined;
    return selections[kind];
  };

  ddd.getSelFeed = function() {
    var sel = ddd.getSel();
    var feedsById = amplify.store('feeds-by-id');
    if (sel.name === 'feeds') {
      var selectors = $all(sel.siz);
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

  ddd.scrollPage = function(dir) {
    window.scrollBy(0, 60 * dir);
  };

  ddd.cmd_open = function() {
    var opener = $('#opener'),
      to_open;
    if (ddd.currentView === 'home') return;
    if (ddd.currentView === 'article') {
      var articleA = $('#full_article');
      if (!articleA) return;
      //$(to_open).click();
      to_open = articleA.getAttribute('href');
      //return;
    } else if (ddd.currentView === 'feed') {
      var sel = ddd.getSel();
      if (sel === undefined) return;
      var headlines = ddd.feed.currentHeadlines;
      if (headlines && sel.sel < headlines.length) {
        var article = headlines[sel.sel];
        to_open = article.link;
        if (!to_open) return;
        ddd.feed.markArticleRead(article, sel.sel);
      }
      ddd.feed.showSelection();
    }
    if (!to_open) return;
    opener.setAttribute('href', to_open);
    //console.log('to_open=', to_open);
    if ($.browser.firefox) {
      opener.click();
    } else {
      // open in a background tab if possible
      //<https://developer.mozilla.org/en/docs/DOM/event.initMouseEvent>
      //https://github.com/philc/vimium/blob/master/lib/dom_utils.coffee
      var evt = document.createEvent("MouseEvents");
      if (platform === 'Mac') {
        evt.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, true, false, false, true, 0, null);
      } else {
        evt.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, true, false, false, false, 0, null);
      }
      opener.dispatchEvent(evt);
    }
    if (ddd.viewMode.goHomeIfFeedIsEmpty()) return;
  };

  ddd.cmd_click_feed = function(target) {
    // if we're on the home view and click a feed set the selection
    // here so the clicked feed == selected feed
    var sel = ddd.getSel('feeds'),
      i = 0,
      clickedIndex = -1;
    if (!sel) return;
    var eles = $all(sel.siz);
    // deselect the currently selected item
    if (sel.sel < eles.length) {
      eles[sel.sel].classList.remove('sel');
    }
    // unfortunatley the feed's index can not be used since the index does not adjust as feeds
    // are marked read so this search must be done
    // target is a an anchor, we need a li which is the parent
    // Sigh on Opera target is a div
    var ele = target.parentElement;
    if (ele.localName === 'a') {
      ele = ele.parentElement;
    }
    for(; i < eles.length; i++) {
      if(eles[i] === ele) {
        clickedIndex = i;
        break;
      }
    }
    //console.log('clickedIndex is', clickedIndex);
    if (clickedIndex != -1) {
      sel.sel = clickedIndex;
    }
  };

  ddd.cmd_move_sel = function(dir) {
    var sel = ddd.getSel();
    if (sel === undefined) return;
    if (sel.name === 'article') {
      ddd.scrollPage(dir);
      return;
    }
    var items = ddd.moveSel(sel, dir);
    if (!items) {
      if (sel.items.length > 0) ddd.feed.showSelection();
      return;
    }
    items[sel.sel - dir].classList.remove('sel');
    items[sel.sel].classList.add('sel');

    //var scrollTop = document.body.scrollTop;
    var elem = items[sel.sel];
    var elemTop = elem.offsetTop;
    //var docHeight = document.body.clientHeight;
    var isVisible = isScrolledIntoView(elem);
    if (isVisible) return;
    var offsetHeight = elem.offsetHeight;
    //console.log('offsetHeight=', offsetHeight);
    var toScroll = $.browser.chrome ? document.body : $('html');
    if (dir < 0) {
      toScroll.scrollTop = elemTop - (offsetHeight - 5);
    } else {
      var inc = offsetHeight;
      toScroll.scrollTop = toScroll.scrollTop + inc;
      //console.log('inc scrollTopBy ' + inc + ' scrollTop=' + document.body.scrollTop);
    }
  };

  function isScrolledIntoView(elem) {
    var toScroll = $.browser.chrome ? document.body : $('html');
    var docViewTop = toScroll.scrollTop;
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
      if(name) {
        var view = $('#view-' + name);
        view.classList.remove('hidden');
        ddd.prevHref = this.previous;
        ddd.currentView = name;
      }
    },
    notfound: function() {
      ruto.go('/');
    }
  })
    .add('/', 'home', function() {
    ddd.feeds.commitFeed();
    ddd.feed.showSelection();
  })
    .add('/about', 'about')
    .add('/settings', 'settings', function() {
      ddd.settingsView.render();
    })
    .add('/logout', function(){
      ddd.logout();
    })
    .add('/login', 'login')
    .add('/login_submit', function() {
    ddd.login.attempt_login();
  })
    .add(/^\/feed\/(\d+)$/i, 'feed', function(path, id) {
    ddd.feed.render(id);
  })
    .add(/^\/feed\/(\w+)$/i, 'feed', function(path, name) {
    var id = ddd.feeds.specialNameToId[name];
    ddd.feed.render(id);
  })
    .add(/^\/article\/(\d+)\/(\d+)$/i, 'article', function(path, id, index) {
    ddd.article.render(id, index - 1);
  });
};
//XXX TEMPLATES HERE
if (!dddns.poll) {
  var poll = function() {
    if (dddns.dddPlat && dddns.ddd && dddns.lib) {
      console.log('everything is loaded');
      dddns.ddd(window);
      dddns.dddPlat(window);
      dddns.poll = 1;
    } else {
      window.setTimeout(dddns.poll, 75);
    }
  };
  dddns.poll = poll;
  window.setTimeout(poll, 75);
}
