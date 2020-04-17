// For ease of debuggin / tweaking:
// https://astexplorer.net/#/gist/bcca584efdab6c981a75618642c76a22/1e1d262eaeb47b7da66150e0781a02b96e597b25
module.exports = function(babel) {
  let t = babel.types;

  function makeSetComponentTemplateMemberExpression() {
    return t.memberExpression(t.identifier('Ember'), t.identifier('_setComponentTemplate'));
  }

  function makeColocatedTemplateIdentifier() {
    return t.identifier('__COLOCATED_TEMPLATE__');
  }

  return {
    name: 'ember-cli-htmlbars-colocation-template',

    visitor: {
      VariableDeclarator(path, state) {
        if (path.node.id.name === '__COLOCATED_TEMPLATE__') {
          state.colocatedTemplateFound = true;
        }
      },

      ExportDefaultDeclaration(path, state) {
        if (state.colocatedTemplateFound !== true || state.setComponentTemplateInjected === true) {
          return;
        }

        state.setComponentTemplateInjected = true;
        let defaultExportDeclaration = path.node.declaration;
        let setComponentTemplateMemberExpression = makeSetComponentTemplateMemberExpression();
        let colocatedTemplateIdentifier = makeColocatedTemplateIdentifier();

        if (defaultExportDeclaration.type === 'ClassDeclaration') {
          // when the default export is a ClassDeclaration with an `id`,
          // wrapping it in a CallExpression would remove that class from the
          // local scope which would cause issues for folks using the declared
          // name _after_ the export
          if (defaultExportDeclaration.id !== null) {
            path.parent.body.push(
              t.expressionStatement(
                t.callExpression(setComponentTemplateMemberExpression, [
                  colocatedTemplateIdentifier,
                  defaultExportDeclaration.id,
                ])
              )
            );
          } else {
            path.node.declaration = t.callExpression(setComponentTemplateMemberExpression, [
              colocatedTemplateIdentifier,
              t.classExpression(
                null,
                defaultExportDeclaration.superClass,
                defaultExportDeclaration.body
              ),
            ]);
          }
        } else {
          path.node.declaration = t.callExpression(setComponentTemplateMemberExpression, [
            colocatedTemplateIdentifier,
            defaultExportDeclaration,
          ]);
        }
      },

      ExportNamedDeclaration(path, state) {
        if (state.colocatedTemplateFound !== true || state.setComponentTemplateInjected === true) {
          return;
        }

        let defaultSpecifier = path.node.specifiers.find(spec => spec.exported.name === 'default');
        if (defaultSpecifier) {
          state.setComponentTemplateInjected = true;
          path.parent.body.push(
            t.expressionStatement(
              t.callExpression(makeSetComponentTemplateMemberExpression(), [
                makeColocatedTemplateIdentifier(),
                defaultSpecifier.local,
              ])
            )
          );
        }
      },
    },
  };
};
