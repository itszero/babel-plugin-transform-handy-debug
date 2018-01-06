# Handy Debug

(officially: babel-plugin-transform-handy-debug)

This is a babel plugin that aim to provide a collection of handy debugging
transformation. Well, the current collection size is ... 1.

## Features

### __printLocals()

It prints all declared variables from the parent function scope up to the
current running point.

For example, this code snippet:

```
function test() {
  const a = 1;
  if (a === 1) {
    const b = 2;
    f(a, b);
    __printLocals();
    const c = 3;
  }
}
```

It will print out the content for a and b. Think it as a shortcut for
everyone's beloved console logging.

