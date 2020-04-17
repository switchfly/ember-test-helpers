'use strict';

const fs = require('fs');
const path = require('path');
const hashForDep = require('hash-for-dep');
const debugGenerator = require('heimdalljs-logger');
const logger = debugGenerator('ember-cli-htmlbars:utils');
const addDependencyTracker = require('./addDependencyTracker');

const INLINE_PRECOMPILE_MODULES = Object.freeze({
  'ember-cli-htmlbars': 'hbs',
  'ember-cli-htmlbars-inline-precompile': 'default',
  'htmlbars-inline-precompile': 'default',
});

function isInlinePrecompileBabelPluginRegistered(plugins) {
  return plugins.some(plugin => {
    if (Array.isArray(plugin)) {
      let [pluginPathOrInstance, options] = plugin;

      return (
        pluginPathOrInstance === require.resolve('babel-plugin-htmlbars-inline-precompile') &&
        typeof options.modules === 'object' &&
        options.modules['ember-cli-htmlbars'] === 'hbs'
      );
    } else if (
      plugin !== null &&
      typeof plugin === 'object' &&
      plugin._parallelBabel !== undefined
    ) {
      return (
        plugin._parallelBabel.requireFile === require.resolve('./require-from-worker') &&
        typeof plugin._parallelBabel.params === 'object' &&
        typeof plugin._parallelBabel.params.modules === 'object' &&
        plugin._parallelBabel.params.modules['ember-cli-htmlbars'] === 'hbs'
      );
    } else {
      return false;
    }
  });
}

function isColocatedBabelPluginRegistered(plugins) {
  return plugins.some(
    plugin => typeof plugin === 'string' && plugin === require.resolve('./colocated-babel-plugin')
  );
}

function buildParalleizedBabelPlugin(pluginInfo, templateCompilerPath) {
  let parallelBabelInfo = {
    requireFile: require.resolve('./require-from-worker'),
    buildUsing: 'build',
    params: {
      templateCompilerPath,
      parallelConfigs: pluginInfo.parallelConfigs,
      modules: INLINE_PRECOMPILE_MODULES,
    },
  };

  // parallelBabelInfo will not be used in the cache unless it is explicitly included
  let cacheKey = makeCacheKey(templateCompilerPath, pluginInfo, JSON.stringify(parallelBabelInfo));

  return {
    _parallelBabel: parallelBabelInfo,
    baseDir: () => __dirname,
    cacheKey: () => cacheKey,
  };
}

function buildOptions(projectConfig, templateCompilerPath, pluginInfo) {
  let EmberENV = projectConfig.EmberENV || {};

  purgeModule(templateCompilerPath);

  // do a full clone of the EmberENV (it is guaranteed to be structured
  // cloneable) to prevent ember-template-compiler.js from mutating
  // the shared global config
  let clonedEmberENV = JSON.parse(JSON.stringify(EmberENV));
  global.EmberENV = clonedEmberENV; // Needed for eval time feature flag checks

  let htmlbarsOptions = {
    isHTMLBars: true,
    EmberENV: EmberENV,
    templateCompiler: require(templateCompilerPath),
    templateCompilerPath: templateCompilerPath,

    plugins: {
      ast: pluginInfo.plugins,
    },

    dependencyInvalidation: pluginInfo.dependencyInvalidation,

    pluginCacheKey: pluginInfo.cacheKeys,
  };

  purgeModule(templateCompilerPath);

  delete global.Ember;
  delete global.EmberENV;

  return htmlbarsOptions;
}

function purgeModule(templateCompilerPath) {
  // ensure we get a fresh templateCompilerModuleInstance per ember-addon
  // instance NOTE: this is a quick hack, and will only work as long as
  // templateCompilerPath is a single file bundle
  //
  // (╯°□°）╯︵ ɹǝqɯǝ
  //
  // we will also fix this in ember for future releases

  // Module will be cached in .parent.children as well. So deleting from require.cache alone is not sufficient.
  let mod = require.cache[templateCompilerPath];
  if (mod && mod.parent) {
    let index = mod.parent.children.indexOf(mod);
    if (index >= 0) {
      mod.parent.children.splice(index, 1);
    } else {
      throw new TypeError(
        `ember-cli-htmlbars attempted to purge '${templateCompilerPath}' but something went wrong.`
      );
    }
  }

  delete require.cache[templateCompilerPath];
}

function registerPlugins(templateCompiler, plugins) {
  if (plugins) {
    for (let type in plugins) {
      for (let i = 0, l = plugins[type].length; i < l; i++) {
        templateCompiler.registerPlugin(type, plugins[type][i]);
      }
    }
  }
}

function unregisterPlugins(templateCompiler, plugins) {
  if (plugins) {
    for (let type in plugins) {
      for (let i = 0, l = plugins[type].length; i < l; i++) {
        templateCompiler.unregisterPlugin(type, plugins[type][i]);
      }
    }
  }
}

function initializeEmberENV(templateCompiler, EmberENV) {
  if (!templateCompiler || !EmberENV) {
    return;
  }

  let props;

  if (EmberENV.FEATURES) {
    props = Object.keys(EmberENV.FEATURES);

    props.forEach(prop => {
      templateCompiler._Ember.FEATURES[prop] = EmberENV.FEATURES[prop];
    });
  }

  if (EmberENV) {
    props = Object.keys(EmberENV);

    props.forEach(prop => {
      if (prop === 'FEATURES') {
        return;
      }

      templateCompiler._Ember.ENV[prop] = EmberENV[prop];
    });
  }
}

function template(templateCompiler, string, options) {
  let precompiled = templateCompiler.precompile(string, options);
  return 'Ember.HTMLBars.template(' + precompiled + ')';
}

function setup(pluginInfo, options) {
  let projectConfig = options.projectConfig || {};
  let templateCompilerPath = options.templateCompilerPath;

  let htmlbarsOptions = buildOptions(projectConfig, templateCompilerPath, pluginInfo);
  let { templateCompiler } = htmlbarsOptions;

  let cacheKey = makeCacheKey(templateCompilerPath, pluginInfo);

  registerPlugins(templateCompiler, {
    ast: pluginInfo.plugins,
  });

  let { precompile } = templateCompiler;
  precompile.baseDir = () => path.resolve(__dirname, '..');
  precompile.cacheKey = () => cacheKey;

  let plugin = [
    require.resolve('babel-plugin-htmlbars-inline-precompile'),
    { precompile, modules: INLINE_PRECOMPILE_MODULES },
    'ember-cli-htmlbars:inline-precompile',
  ];

  return plugin;
}

function makeCacheKey(templateCompilerPath, pluginInfo, extra) {
  let templateCompilerFullPath = require.resolve(templateCompilerPath);
  let templateCompilerCacheKey = fs.readFileSync(templateCompilerFullPath, { encoding: 'utf-8' });
  let cacheItems = [templateCompilerCacheKey, extra].concat(pluginInfo.cacheKeys.sort());
  // extra may be undefined
  return cacheItems.filter(Boolean).join('|');
}

function setupPlugins(wrappers) {
  let plugins = [];
  let cacheKeys = [];
  let parallelConfigs = [];
  let unparallelizableWrappers = [];
  let dependencyInvalidation = false;
  let canParallelize = true;

  for (let i = 0; i < wrappers.length; i++) {
    let wrapper = wrappers[i];

    if (wrapper.requireFile) {
      const plugin = require(wrapper.requireFile);
      wrapper = plugin[wrapper.buildUsing](wrapper.params);
    }

    if (wrapper.parallelBabel) {
      parallelConfigs.push(wrapper.parallelBabel);
    } else {
      unparallelizableWrappers.push(wrapper.name);
      canParallelize = false;
    }

    dependencyInvalidation = dependencyInvalidation || wrapper.dependencyInvalidation;
    plugins.push(addDependencyTracker(wrapper.plugin, wrapper.dependencyInvalidation));

    let providesBaseDir = typeof wrapper.baseDir === 'function';
    let augmentsCacheKey = typeof wrapper.cacheKey === 'function';

    // TODO: investigate if `wrapper.dependencyInvalidation` should actually prevent the warning
    if (providesBaseDir || augmentsCacheKey || wrapper.dependencyInvalidation) {
      if (providesBaseDir) {
        let pluginHashForDep = hashForDep(wrapper.baseDir());
        cacheKeys.push(pluginHashForDep);
      }
      if (augmentsCacheKey) {
        cacheKeys.push(wrapper.cacheKey());
      }
    } else {
      logger.debug(
        'ember-cli-htmlbars is opting out of caching due to an AST plugin that does not provide a caching strategy: `' +
          wrapper.name +
          '`.'
      );
      cacheKeys.push(new Date().getTime() + '|' + Math.random());
    }
  }

  return {
    plugins,
    cacheKeys,
    parallelConfigs,
    canParallelize,
    unparallelizableWrappers,
    dependencyInvalidation: !!dependencyInvalidation,
  };
}

module.exports = {
  buildOptions,
  purgeModule,
  registerPlugins,
  unregisterPlugins,
  initializeEmberENV,
  template,
  setup,
  makeCacheKey,
  setupPlugins,
  isColocatedBabelPluginRegistered,
  isInlinePrecompileBabelPluginRegistered,
  buildParalleizedBabelPlugin,
};
