(function(d){
  config = {
    api:'/tt-rss/',

    // FEED_LIMIT does not really work with unread only since the unread check
    // is done in code after the db query that includes a limit. there will be missed
    // results
    article_limit:  30,
    
    // Auto refresh every x number of minutes. Be nice to your server :)
    // Turn auto refresh off with -1
    refresh_every:  15,

    show_special_folders: false,

    // only show unread feeds and articles
    unread_only: true,

    // default = true
    // Sanitize article content, there are pros and cons to sanitize=true
    // At the moment, setting this to false has the following cons:
    //  - breaks images, 
    //  - plain-text linkification is disabled
    //  - links no longer open in new tabs by default
    //
    //  the pro is embedded videos work
    // By default the server assumes sanitize = true so there is no need to
    // uncomment this unless you want to disable sanitize
    //sanitizeContent: false,
  };

  window._ddd_config = config;
})(document);

