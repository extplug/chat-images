import $ from 'jquery'
import { View } from 'backbone'

const EmbedView = View.extend({
  className: 'extplug-chat-image',

  render() {
    this.$close = $('<div />')
      .addClass('extplug-close')
      .append($('<i />').addClass('icon icon-dialog-close'))

    this.$link = $('<a />')
      .attr('href', this.options.url)
      .attr('title', this.options.url)
      .attr('target', '_blank')

    let image = this.getImage().on('load', () => {
      this.trigger('load')
    })

    this.$el
      .empty()
      .append(this.$close)
      .append(this.$link.append(image))

    this.$close.on('click', e => {
      // ctrl+click closes all
      if (e.ctrlKey) {
        $('#chat-messages .extplug-chat-image .extplug-close').click()
      }
      else {
        this.close()
      }
    })

    return this
  },

  close() {
    this.$link.text(this.options.url)
    this.$el.replaceWith(this.$link)
    this.destroy()
  }

})

export default EmbedView