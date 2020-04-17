import EmberRouter from '@ember/routing/router';
import config from './config/environment';

const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL,
});

Router.map(function() {
  this.mount('lazy-engine', { path: '/use-lazy-engine', as: 'use-lazy-engine' });
});

export default Router;
