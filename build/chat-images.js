define('extplug/chat-images/embedders',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var generic = /\b(https?):\/\/\S+?\/\S+\.(?:jpe?g|gif|png|webp)\b(?:\?\S+)?/gi;
  exports.generic = generic;
  var webm = /\b(https?):\/\/\S+?\/\S+\.webm\b(?:\?\S+)?/gi;
  exports.webm = webm;
  var gifv = /https?:\/\/i\.imgur\.com\/(?:.{7})\.(?:gifv|mp4|webm)/gi;
  exports.gifv = gifv;
});
define('extplug/chat-images/EmbedView',['exports', 'module', 'jquery', 'backbone'], function (exports, module, _jquery, _backbone) {
  'use strict';

  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj['default'] : obj; };

  var _$ = _interopRequire(_jquery);

  var EmbedView = _backbone.View.extend({
    className: 'extplug-chat-image',

    render: function render() {
      var _this = this;

      this.$close = _$('<div />').addClass('extplug-close').append(_$('<i />').addClass('icon icon-dialog-close'));

      this.$link = _$('<a />').attr('href', this.options.url).attr('title', this.options.url).attr('target', '_blank');

      var image = this.getImage().on('load', function () {
        _this.trigger('load');
      });

      this.$el.empty().append(this.$close).append(this.$link.append(image));

      this.$close.on('click', function (e) {
        // ctrl+click closes all
        if (e.ctrlKey) {
          _$('#chat-messages .extplug-chat-image .extplug-close').click();
        } else {
          _this.close();
        }
      });

      return this;
    },

    close: function close() {
      this.$link.text(this.options.url);
      this.$el.replaceWith(this.$link);
      this.destroy();
    }

  });

  module.exports = EmbedView;
});
define('extplug/chat-images/ImageView',['exports', 'module', './EmbedView'], function (exports, module, _EmbedView) {
  'use strict';

  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj['default'] : obj; };

  var _EmbedView2 = _interopRequire(_EmbedView);

  var ImageView = _EmbedView2.extend({
    className: 'extplug-chat-image',

    getImage: function getImage() {
      return $('<img />').attr('alt', this.options.url).attr('src', this.options.url);
    }
  });

  module.exports = ImageView;
});
define('extplug/chat-images/VideoView',['exports', 'module', './EmbedView'], function (exports, module, _EmbedView) {
  'use strict';

  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj['default'] : obj; };

  var _EmbedView2 = _interopRequire(_EmbedView);

  var getExtension = function getExtension(url) {
    return new URL(url).pathname.split('.').pop();
  };

  var VideoView = _EmbedView2.extend({

    getImage: function getImage() {
      var _this = this;

      this.$video = $('<video />').attr({
        autoplay: true,
        loop: true,
        muted: true,
        poster: this.options.poster || ''
      });

      this.options.sources.forEach(function (url) {
        _this.$video.append($('<source />').attr({
          href: url,
          type: 'video/' + getExtension(url)
        }));
      });

      return this.$video;
    }
  });

  module.exports = VideoView;
});
define('extplug/chat-images/style',['exports', 'module'], function (exports, module) {
  'use strict';

  module.exports = {

    '.extplug-chat-image': {
      position: 'relative',

      '.extplug-close': {
        position: 'absolute',
        top: '3px',
        right: '3px',
        width: '30px',
        height: '30px',
        display: 'none',
        'z-index': 30,
        opacity: '0.5',
        cursor: 'pointer'
      },
      '.extplug-close:hover': {
        opacity: 1
      }
    },

    '.extplug-chat-image:hover': {
      '.extplug-close': {
        display: 'block'
      }
    },

    '.extplug-chat-image img, .extplug-chat-image video': {
      'max-width': '100%',
      'max-height': '300px',
      'z-index': 10
    }

  };
});
define('extplug/chat-images/main',['exports', 'module', 'extplug/Plugin', 'plug/core/Events', 'plug/facades/chatFacade', './embedders', './ImageView', './VideoView', './style', 'underscore', 'meld', 'jquery'], function (exports, module, _extplugPlugin, _plugCoreEvents, _plugFacadesChatFacade, _embedders, _ImageView, _VideoView, _style, _underscore, _meld, _jquery) {
  'use strict';

  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj['default'] : obj; };

  var _Plugin = _interopRequire(_extplugPlugin);

  var _Events = _interopRequire(_plugCoreEvents);

  var _chatFacade = _interopRequire(_plugFacadesChatFacade);

  var _ImageView2 = _interopRequire(_ImageView);

  var _VideoView2 = _interopRequire(_VideoView);

  var _styles = _interopRequire(_style);

  var _$ = _interopRequire(_jquery);

  var embedSymbol = Symbol('images');

  var ChatImages = _Plugin.extend({
    name: 'Chat Images',
    description: 'Embeds chat images in chat.',

    commands: {
      collapse: 'closeAll'
    },

    init: function init(id, ext) {
      this._super(id, ext);
      this.closeAll = this.closeAll.bind(this);
    },

    enable: function enable() {
      var _this = this;

      this.advice = _meld.around(_chatFacade, 'parse', function (joinpoint) {
        // only intercept parse() calls that are actually used for chat
        if (joinpoint.args.length > 1) {
          var msg = joinpoint.args[1];
          _this.onBeforeReceive(msg);
          return joinpoint.proceed(msg.message, msg, joinpoint.args[2]);
        }
        return joinpoint.proceed();
      });
      _Events.on('chat:afterreceive', this.onAfterReceive, this);
      this.Style(_styles);
    },

    disable: function disable() {
      this.advice.remove();
      _Events.off('chat:afterreceive', this.onAfterReceive);
    },

    addEmbed: function addEmbed(msg, url, view) {
      var id = _underscore.uniqueId('embed');
      msg[embedSymbol].push({
        id: id,
        url: url,
        view: view
      });
      return '<i id="' + id + '"></i>';
    },

    closeAll: function closeAll() {
      _$('#chat-messages .extplug-chat-image .extplug-close').click();
    },

    onBeforeReceive: function onBeforeReceive(msg) {
      var _this2 = this;

      msg[embedSymbol] = [];

      msg.message = msg.message.replace(_embedders.generic, function (url) {
        return _this2.addEmbed(msg, url, new _ImageView2({ url: url }));
      });

      msg.message = msg.message.replace(_embedders.webm, function (url) {
        return _this2.addEmbed(msg, url, new _VideoView2({
          url: url,
          sources: [url]
        }));
      });

      msg.message = msg.message.replace(_embedders.gifv, function (url) {
        var path = url.split('.').slice(0, -1).join('.');
        return _this2.addEmbed(msg, url, new _VideoView2({
          url: url,
          poster: '' + path + '.jpg',
          sources: ['' + path + '.webm', '' + path + '.mp4']
        }));
      });
    },
    onAfterReceive: function onAfterReceive(msg, el) {
      var _this3 = this;

      if (msg[embedSymbol]) {
        msg[embedSymbol].forEach(function (embed) {
          el.find('#' + embed.id).replaceWith(embed.view.$el);
          embed.view.once('load', _this3.checkScroll, _this3);
          embed.view.render();
        });
      }
    },

    checkScroll: function checkScroll() {
      var msg = _$('#chat-messages');
      var shouldScroll = msg.scrollTop() > msg[0].scrollHeight - msg.height() - msg.children().last().height();
      if (shouldScroll) {
        msg.scrollTop(msg[0].scrollHeight);
      }
    }

  });

  module.exports = ChatImages;
});