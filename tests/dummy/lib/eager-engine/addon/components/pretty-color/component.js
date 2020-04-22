import Component from '@ember/component';
import { computed } from '@ember/object';
import layout from './template';

export default Component.extend({
  layout,
  attributeBindings: ['style'],

  style: computed('name', function () {
    return `color: ${this.name}`;
  }),
});
