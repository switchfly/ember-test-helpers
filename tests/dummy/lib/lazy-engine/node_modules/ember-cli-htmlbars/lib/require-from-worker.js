'use strict';

const utils = require('./utils');
let astPlugin = {};

module.exports = {
  build(options, cacheKey) {
    // Caching the plugin info so that call to setup functions will be made once per worker
    // and not once per module tranformation
    let plugin = astPlugin[cacheKey];
    if (!plugin) {
      const pluginInfo = utils.setupPlugins(options.parallelConfigs);

      plugin = utils.setup(pluginInfo, options);

      // if cacheKey is not undefined cache it.
      if (cacheKey) {
        astPlugin[cacheKey] = plugin;
      }
    }
    return plugin;
  },
};
