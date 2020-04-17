'use strict';

const stringify  = require('json-stable-stringify');
const crypto = require('crypto');
const hashForDep = require('hash-for-dep');
const path = require('path');
const fs = require('fs');

module.exports = function optionsHash(options, console) {
  const hash = { plugins: [] };

  for (let key in options) {
    if (key === 'plugins') {
      continue;
    }
    const value = options[key];
    hash[key] = (typeof value === 'function') ? (value + '') : value;
  }

  if (options.plugins) {
    if (!Array.isArray(options.plugins)) {
      throw new TypeError('broccoli-babel-transpiler: babel options.plugins must either be omitted or an array');
    }

    const cacheableItems = [];

    for (let i = 0; i < options.plugins.length; i++) {
      const plugin = options.plugins[i];

      if (isAbsolutePathPlugin(plugin)) {
        const pluginPath = typeof plugin === 'string' ? plugin : plugin[0];
        cacheableItems.push(hashForDep('.', modulePath(pluginPath)))

        if (typeof plugin === 'string') {
          // do nothing
        } else if (Array.isArray(plugin)) {
          plugin.slice(1).forEach(item => cacheableItems.push(item));
        } else {
          throw new TypeError('Expected string or array but got: ' + typeof plugin);
        }
      } else {
        cacheableItems.push(plugin);
      }
    }

    for (let i = 0; i < cacheableItems.length; i++) {
      const item = cacheableItems[i];
      const type = typeof item;
      if (Array.isArray(item)) {
        item.forEach(part => cacheableItems.push(part));
      } else if (item === null) {
        hash.plugins.push(item);
      } else if (type === 'function' || type === 'object') {
        const augmentsCacheKey = typeof item.cacheKey === 'function';
        const providesBaseDir = typeof item.baseDir === 'function';

        if (augmentsCacheKey) { hash.plugins.push(item.cacheKey()); }
        if (providesBaseDir)  { hash.plugins.push(hashForDep(item.baseDir())); }

        if (!providesBaseDir && !augmentsCacheKey) {
          if (type === 'object') {
            // iterate all keys in the item and push them into the cache
            Object.keys(item).forEach(key => {
              cacheableItems.push(key);
              cacheableItems.push(item[key]);
            });
          } else {
            // prevent caching completely if the plugin doesn't provide baseDir
            // we cannot ensure that we aren't causing invalid caching pain...
            console.warn('broccoli-babel-transpiler is opting out of caching due to a plugin that does not provide a caching strategy: `' + item + '`.');

            // so simply provide a unstable hash value and skip serialization
            return crypto.createHash('md5').update((new Date).getTime() + '|' + Math.random(), 'utf8').digest('hex');
          }
        }
      } else if (type !== 'object') {
        // handle native strings, numbers (which can JSON.stringify properly)
        hash.plugins.push(item);
      } else {
        throw new Error('broccoli-babel-transpiler: unknown babel options value');
      }
    }
  }

  return crypto.createHash('md5').update(stringify(hash), 'utf8').digest('hex');
}


function isAbsolutePath(maybePath) {
  return typeof maybePath === 'string' && path.isAbsolute(maybePath);
}

module.exports.isAbsolutePathPlugin = isAbsolutePathPlugin;
function isAbsolutePathPlugin(maybePlugin) {
  if (isAbsolutePath(maybePlugin)) {
    return true;
  }

  if (Array.isArray(maybePlugin) && isAbsolutePath(maybePlugin[0])) {
    return true;
  }

  return false
}

const MODULE_NAME_FROM_PATH_CACHE = Object.create(null);
const THROW_ON_ACCESS = function() { }

function couldNotInferModuleFrom(from) {
  throw new Error('Could not infer module from: `' + from + '`')
}

module.exports.modulePath = modulePath;
function modulePath(filePath) {
  const originalFilePath = filePath;
  const cachedValue = MODULE_NAME_FROM_PATH_CACHE[originalFilePath];

  if (cachedValue === THROW_ON_ACCESS) {
    couldNotInferModuleFrom(originalFilePath);
  } else if (typeof cachedValue === 'string') {
    return cachedValue;
  }

  while (filePath !== '/') {
    const test = filePath + '/package.json';

    if (fs.existsSync(test)) {
      MODULE_NAME_FROM_PATH_CACHE[originalFilePath] = filePath;
      return filePath;
    }

    filePath = path.dirname(filePath);
  }

  MODULE_NAME_FROM_PATH_CACHE[originalFilePath] = THROW_ON_ACCESS;
  couldNotInferModuleFrom(originalFilePath);
}

