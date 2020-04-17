# master

# 3.1.0

- Add `this.input` and `this.ouput` to broccoli-plugin instances, this aims to replace nearly all usage of `this.inputPaths` and `this.outputPath`. See the `Readme` for further details

# 3.0.0

- Add `pluginInterface.trackInputChanges` and expose as `options.trackInputChanges`. This adds a change object
  that will be passed to the build method which contains information about which input has changed since the
  last build.

- Convert to typescript

- Drop node 6 support

# 2.1.0

- Add `pluginInterface.volatile` and expose as `options.volatile`. This tells broccoli to opt out of memoization and
  the build method will always be called regardless if the inputNodes have changed.

# 2.0.0

- [BREAKING] modernize code-base, use ES classes
- [BREAKING] set a new node engine version support "node": "6._ || 8._ || >= 10.\*"

# 1.3.1

- Update the validation for input nodes. Previously passing `[]` as an input
  node wasn't caught by the validation but caused an error later during
  `.build` method invocation.

# 1.3.0

- Add `pluginInterface.needsCache` and expose as `options.needsCache`. This adds the ability
  to opt-out of cache directory creation.

# 1.2.3

- Avoid extra work in `.read`-compatibility mode when input nodes have stable output paths

# 1.2.2

- Whitelist JS files in package.json
- re-release without tmp/

# 1.2.1

- Throw error immediately when inputNodes contains something other than input nodes

# 1.2.0

- Add `sourceDirectories` feature flag, which introduces `pluginInterface.nodeType`
- Allow for calling `__broccoliGetInfo__()` without argument

# 1.1.0

- Add `persistentOutput` flag

# 1.0.0

- Initial release
