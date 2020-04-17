import EmberRouter from '@ember/routing/router';
import config from './config/environment';

const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL,
});

Router.map(function() {
  this.mount('eager-engine', { path: '/use-eager-engine', as: 'use-eager-engine' });
});

export default Router;
