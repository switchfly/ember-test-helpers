const { createTempDir } = require('broccoli-test-helper');
const { setEdition, has, _getEdition } = require('./index');

const { test } = QUnit;

const OriginalConsole = Object.assign({}, console);
const ROOT = process.cwd();

QUnit.module('@ember/edition-utils', function(hooks) {
  let project;

  hooks.beforeEach(async function() {
    project = await createTempDir();
    process.chdir(project.path());
  });

  hooks.afterEach(async function() {
    delete process.env.EMBER_EDITION;
    delete process.env.EMBER_VERSION;
    Object.assign(console, OriginalConsole);

    process.chdir(ROOT);
    await project.dispose();
  });

  QUnit.module('setEdition', function() {
    test('the edition name that is passed, sets the edition', function(assert) {
      assert.notOk(has('octane'), 'precond');

      setEdition('octane');

      assert.ok(has('octane'));
    });

    test('normalizes the edition name that is passed in (lowercasing)', function(assert) {
      assert.notOk(has('octane'), 'precond');

      setEdition('OCTANE');

      assert.ok(has('octane'));
    });
  });

  QUnit.module('has', function() {
    function setupProject(edition) {
      let pkg = {
        name: 'dummy',
        version: '0.0.0',
      };

      if (edition) {
        pkg.ember = { edition };
      }

      project.write({
        'package.json': JSON.stringify(pkg, null, 2),
      });
    }

    test('should be octane if project package.json is setup with edition: octane', function(assert) {
      setupProject('octane');

      assert.ok(has('octane'));
    });

    test('should be octane if project package.json in custom root is setup with edition: octane', function(assert) {
      process.chdir(ROOT);

      setupProject('octane');

      assert.ok(has('octane', project.path()));
    });

    test('has("classic") should be true when octane is set', function(assert) {
      setupProject('octane');

      assert.ok(has('classic'));
    });

    QUnit.module('deprecated setEdition fallback', function() {
      test('project package.json "wins" over setEdition', function(assert) {
        setupProject('classic');

        setEdition('octane');

        assert.ok(has('classic'));
      });

      test('should be considered "classic" without an edition set', function(assert) {
        assert.ok(has('classic'));
      });

      test('should be considered "octane" when passing octane', function(assert) {
        setEdition('octane');

        assert.ok(has('octane'));
      });

      test('should match case insensitively', function(assert) {
        setEdition('octane');

        assert.ok(has('OCTANE'));
      });


      test('should not be octane, when edition is setEdition("classic") [deprecated]', function(assert) {
        setEdition('classic');

        assert.notOk(has('octane'));
      });

      test('should infer edition from process.env.EMBER_VERSION with a warning', function(assert) {
        assert.expect(2);

        process.env.EMBER_VERSION = 'octane';
        console.log = (...args) => {
          assert.deepEqual(args, [
            'Please update to using @ember/edition-utils. Using process.env.EMBER_VERSION to declare your application / addon as "octane" ready is deprecated.',
          ]);
        }

        assert.ok(has('octane'), 'finds process.env.EMBER_VERSION');
      });
    });
  });
});
