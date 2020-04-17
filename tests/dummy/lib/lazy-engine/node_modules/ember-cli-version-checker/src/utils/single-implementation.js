'use strict';

/* global WeakMap, Map */

const UNIQUE_ADDON_MAP = new WeakMap();

/**
 * Traverse the project's addons tree to determine singleton root,
 * cache the boolean result in project x addonName matrix
 */
module.exports.hasSingleImplementation = hasSingleImplementation;
function hasSingleImplementation(targetName, project) {
  if (!UNIQUE_ADDON_MAP.has(project)) {
    UNIQUE_ADDON_MAP.set(project, new Map());
  }
  let map = UNIQUE_ADDON_MAP.get(project);
  if (map.has(targetName)) {
    return map.get(targetName);
  }

  let lastRoot;

  for (let { name, root } of allAddons(project)) {
    if (targetName === name) {
      if (lastRoot !== undefined) {
        map.set(targetName, false);
        return false;
      } else {
        lastRoot = root;
      }
    }
  }

  map.set(targetName, true);
  return true;
}

module.exports.allAddons = allAddons;
function* allAddons(current) {
  if (Array.isArray(current.addons) === false) {
    return;
  }

  for (let addon of current.addons) {
    yield addon;
    yield* allAddons(addon);
  }
}
