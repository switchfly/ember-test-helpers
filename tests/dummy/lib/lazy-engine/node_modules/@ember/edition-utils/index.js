const fs = require('fs');
const path = require('path');

/**
  Sets the Edition that the application should be considered a part of. This
  method is deprecated, and will be phased out in the next major release.

  @public
  @deprecated
  @param {string} editionName the Edition name that your application is authored in
*/
function setEdition(editionName) {
  process.env.EMBER_EDITION = editionName.toLowerCase();
}

/**
  Resets the local state _as if_ no edition were specified. In general, this
  will be used by various addons' own local blueprint tests when testing
  generators. This method is deprecated, and will be phased out in the next
  major release.

  @public
  @deprecated
*/
function clearEdition() {
  delete process.env.EMBER_EDITION;
}

/**
  Determines what edition is in use.

  @private
  @returns {boolean}
*/
function _getEdition(projectRoot = process.cwd()) {
  let pkgPath = path.join(projectRoot, 'package.json');
  let hasPackageJson = false;

  try {
    require.resolve(pkgPath);
    hasPackageJson = true;
  } catch (e) {
    // ignore errors, this signifies that there is no package.json in the
    // projectRoot so we _only_ check for the legacy environment variables
  }

  let edition;

  if (hasPackageJson) {
    let pkgContents = fs.readFileSync(pkgPath, { encoding: 'utf8' });
    let pkg = JSON.parse(pkgContents);

    if ('ember' in pkg && 'edition' in pkg.ember) {
      edition = pkg.ember.edition;
    }
  }

  if (edition === undefined) {
    edition = process.env.EMBER_EDITION;
  }

  if (edition === undefined) {
    // check fallback "old" location
    edition = process.env.EMBER_VERSION;

    if (edition === 'octane') {
      console.log('Please update to using @ember/edition-utils. Using process.env.EMBER_VERSION to declare your application / addon as "octane" ready is deprecated.');
    }
  }

  if (edition) {
    return edition.toLowerCase();
  }
}

/**
  Determine if the application that is running is running under a given Ember
  Edition.  When the edition in use is _newer_ than the requested edition it
  will return `true`, and if the edition in use by the application is _older_
  than the requested edition it will return `false`.

  @param {string} requestedEditionName the Edition name that the application/addon is requesting
  @param {string} [projectRoot=process.cwd()] the base directory of the project
*/
function has(_requestedEditionName, projectRoot) {
  let requestedEditionName = _requestedEditionName.toLowerCase();
  let edition = _getEdition(projectRoot);

  if (requestedEditionName === 'classic') {
    // everything is classic :)
    return true;
  }

  if (edition === requestedEditionName) {
    return true;
  }

  return false;
}

module.exports = {
  default: setEdition,
  has,
  setEdition,
  clearEdition,
};
