function Remedie() {
  this.initialize();
}

Remedie.prototype = {
  initialize: function() {
    var self = this;

    $(".new-channel-menu").click(function(){ self.toggleNewChannel(true) });
    $(".channel-list-menu").click(function(){ self.toggleChannelView(false) });

    $("#new-channel-form").submit( function(e) { self.newChannel(e); return false; } );
    $("#new-channel-cancel").click( function() { self.toggleNewChannel(false) } );

    $().ajaxStop($.unblockUI);

// I just don't know but livequery SOMETIMES doesn't work with Safari on my Mac mini
//    $(".channel-clickable").livequery('click', function(){
//      self.showChannel(this.href.replace(/.*#channel-/, ""));
//      return false;
//    });
//    $(".item-thumbnail-clickable").livequery('click', function(){
//      self.playVideo(this.href, this.id.replace("item-thumbanil-", ""));
//      return false;
//    });

    this.loadSubscription();
  },

  playVideo: function(url, id) {
    // TODO this only works when you're browsing from Local machine
    // If you're from remote, we should serve files from HTTP and run local
    // QuickTime/VLC to stream from the proxy
    var config = { player: 'Flash' }; // or VLC
    if (config.player == 'Flash') {
       this.playVideoInline(url, id);
    } else if (config.player == 'QTEmbed') {
       this.playVideoInline(url, id, 1);
    } else if (config.player == 'VLC' || config.player == 'QuickTime') {
      $.ajax({
        url: "/rpc/player/play",
        data: { url: url, player: config.player },
        type: 'post',
        dataType: 'json',
        success: function(r) {
          if (r.success) {
          } else {
            alert(r.error);
          }
        },
      });
    }
  },

  playVideoInline: function(url, id, useQTEmbed) {
    var wh = RemedieUtil.calcWindowSize($(window).width());
    var width  = wh[0];
    var height = wh[1] + 20; // slider and buttons

    if (useQTEmbed) {
        var s1 = new QTObject(url, 'player-' + id, width,  height);
        s1.addParam('scale', 'Aspect');
        s1.addParam('target', 'QuickTimePlayer');
        s1.write('flash-player');
    } else {
        var s1 = new SWFObject('/static/player.swf', 'player-' + id, width, height, '9');
        s1.addParam('allowfullscreen','true');
        s1.addParam('allowscriptaccess','always');
        s1.addParam('flashvars','autostart=true&file=' + url);
        s1.write('flash-player');
    }

    $('#flash-player').createAppend(
     'div', { className: 'close-button' }, [
        'a', { onclick: '$.unblockUI()' }, "Click here to close the Player"
      ]
    );

    $.blockUI({
      message: $('#flash-player'),
      css: { top:  ($(window).height() - height) / 2 - 6 + 'px',
             left: ($(window).width()  - width) / 2 + 'px',
             width:  wh[0] + 'px' }
    });
  },

  toggleNewChannel: function(display) {
    if (display) {
      $.blockUI({
        message: $("#new-channel-dialog"),
        css: {
            border: 'none',
            padding: '15px',
            backgroundColor: '#222',
            '-webkit-border-radius': '10px',
            '-moz-border-radius': '10px',
            opacity: '.8',
            color: '#fff'
        },
      });
    } else {
      $.unblockUI();
    }
    return false;
  },

  toggleChannelView: function(display) {
    if (display) {
      $("#subscription").hide();
      $("#channel-pane").show();
    } else {
      $("#subscription").show();
      $("#channel-pane").hide();
    }
    return false;
  },

  newChannel: function(el) {
    var self = this;
    $.blockUI({ css: {   border: 'none',
            padding: '15px',
            backgroundColor: '#222',
            '-webkit-border-radius': '10px',
            '-moz-border-radius': '10px',
            opacity: '.8',
            color: '#fff' } });
    $.ajax({
      url: "/rpc/channel/create",
      data: { url: jQuery.trim( $("#new-channel-url").attr('value') ) },
      type: 'post',
      dataType: 'json',
      success: function(r) {
        if (r.success) {
          $("#new-channel-url").attr('value', '');
          self.toggleNewChannel(false);
          self.renderChannel(r.channel, $("#subscription"));
          self.refreshChannel(r.channel, true)
        } else {
          alert(r.error);
        }
      },
    });
    return false;
  },

  showChannel: function(channel_id) {
    var self = this;
    $("#channel-pane").children().remove();
    $.ajax({
      url: "/rpc/channel/show",
      type: 'get',
      data: { id: channel_id },
      dataType: 'json',
      success: function(r) {
        var channel = r.channel;
        var thumbnail = channel.props.thumbnail ? channel.props.thumbnail.url : "/static/images/feed_128x128.png";
        $("#channel-pane").createAppend(
         'div', { className: 'channel-header', id: 'channel-header-' + channel.id  }, [
           'div', { className: 'channel-header-thumbnail' }, [
             'img', { src: thumbnail, alt: channel.name }, null
           ],
           'div', { className: 'channel-header-infobox', style: 'width: ' + ($(window).width()-220) + 'px' }, [
              'h2', {}, [ 'a', { href: channel.props.link, target: "_blank" }, channel.name ],
              'p', { className: 'channel-header-description' }, channel.props.description
            ],
            'div', { className: 'separator' }, [ 'hr', {}, null ],
            'div', { id: 'channel-items' }, null
          ]
        );
        for (i = 0; i < r.items.length; i++) {
          var item = r.items[i];
          var item_thumb = item.props.thumbnail ? item.props.thumbnail.url : null;
          $("#channel-items").createAppend(
           'div', { className: 'channel-item', id: 'channel-item-' + item.id  }, [
             'div', { className: 'item-thumbnail' }, [
               'a', { className: 'item-thumbnail-clickable', href: item.ident, id: "item-thumbnail-" + item.id,
                      onclick: 'r.playVideo(this.href, '+ item.id +');return false' }, [
                 // TODO load placeholder default image and replace later with new Image + onload
                 'img', { src: item_thumb || thumbnail, alt: item.name, style: 'width: 128px',
                          onload: "r.resizeThumb(this)" }, null
               ]
             ],
             'div', { className: 'item-infobox', style: "width: " + ($(window).width()-220) + "px" }, [
               'div', { className: 'item-infobox-misc' }, [
                  'ul', { className: 'inline' }, [
                    'li', { className: 'first' }, "size: " + RemedieUtil.formatBytes(item.props.size),
                    'li', {}, "updated: " + item.props.updated,
                  ],
               ],
               'h3', {}, item.name,
               'p', { className: 'item-infobox-description' }, item.props.description
             ],
             'div', { className: 'item-separator' }, [ 'hr', {}, null ]
           ]
          );
        }
        self.toggleChannelView(true);
      },
      error: function(r) {
        alert("Can't load the channel");
      }
    });
  },

  refreshChannel : function(channel, first_time) {
    var self = this;
    // TODO animated icon on top of thumbnail
    $.ajax({
      url: "/rpc/channel/refresh",
      data: { id: channel.id },
      type: 'post',
      dataType: 'json',
      success: function(r) {
        if (r.success) {
          // TODO remove nimated icon
          if (first_time) 
            self.redrawChannel(r.channel);
        } else {
          alert(r.error);
        }
      },
    });

  },

  loadSubscription: function() {
    var self = this;
    $.ajax({
      url: "/rpc/channel/load",
      type: 'get',
      dataType: 'json',
      success: function(r) {
        for (i = 0; i < r.channels.length; i++) {
          self.renderChannel(r.channels[i], $("#subscription"));
        }
      },
      error: function(r) {
        alert("Can't load subscription");
      }
    });
  },

  renderChannel: function(channel, container) {
    var thumbnail = channel.props.thumbnail ? channel.props.thumbnail.url : "/static/images/feed_256x256.png";
    container.createAppend(
      'div', { className: 'channel', id: 'channel-' + channel.id  }, [
        'a', { className: 'channel-clickable', href: '#channel-' + channel.id, onclick: 'r.showChannel(' + channel.id + ')' }, [
          'img', { src: thumbnail, alt: channel.name, className: 'channel-thumbnail' }, [],
          'div', { className: 'channel-title' }, channel.name
        ]
      ]
    );
  },

  redrawChannel: function(channel) {
    var id = "#channel-" + channel.id;
    if (!$(id))
       return this.renderChannel(channel, $("#subscription"));

    if (channel.props.thumbnail) 
      $(id + " .channel-thumbnail").attr('src', channel.props.thumbnail.url);

    if (channel.name) 
      $(id + " .channel-title").text(channel.name);

  },

  resizeThumb: function(el) {
    el.style.width = 128;
    if (el.height > el.width) {
      el.style.height = 128;
    } else {
      el.style.height = 128 * el.height / el.width;
    }
  },
};

