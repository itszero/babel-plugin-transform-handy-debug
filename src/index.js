module.exports = function(babel) {
  const { types: t } = babel;

  return {
    name: 'print-locals',
    visitor: {
      CallExpression(path) {
        if (path.node.callee.name === '__printLocals') {
          const parentBlock = path.getFunctionParent();
          if (!parentBlock) {
            path.remove();
            return;
          }

          // collect variables in scope
          const vars = [];
          let stop = false;
          parentBlock.traverse({
            VariableDeclarator(innerPath) {
              if (stop) {
                return;
              }
              const id = innerPath.get('id');
              if (id.isIdentifier()) {
                vars.push(id.node.name);
              } else if (id.isObjectPattern()) {
                id.traverse({ 
                  ObjectProperty(idPath) {
                    vars.push(idPath.node.key.name);
                  }
                });
              }
            },
            CallExpression(innerPath) {
              if (innerPath == path) {
                stop = true;
              }
            }
          });

          // transform
          const objProperties = [];
          vars.forEach(variable => {
            objProperties.push(
              t.objectProperty(t.stringLiteral(variable), t.identifier(variable))
            );
          });

          const objProps = t.objectExpression(objProperties);
          const filterFunc = path.node.arguments.length === 1 && path.node.arguments[0];
          path.replaceWith(
            t.callExpression(
              t.logicalExpression(
                '||',
                t.memberExpression(t.identifier('console'), t.identifier('table')),
                t.memberExpression(t.identifier('console'), t.identifier('log'))
              ),
              [filterFunc ? t.callExpression(filterFunc, [objProps]) : objProps]
            )
          );
        }
      }
    }
  };
};

