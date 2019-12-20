const lodash = require('lodash');

class Parser {
  constructor(func, { required = false, default: _default } = {}) {
    this.func = func;
    this.required = required;
    this.default = _default !== undefined ? func(_default) : undefined;

    return new Proxy(this.call.bind(this), {
      get: (_, key) => this[key],
    });
  }

  call(value) {
    if (value === undefined) {
      value = this.default;
    }

    if (value === undefined) {
      if (this.required) {
        throw new Error(`value is required, got ${value}`);
      }
      return undefined;
    }

    return this.func(value);
  }

  parse(func) {
    return new Parser((...args) => func(this(...args)));
  }

  validate(func) {
    return new Parser(value => {
      value = this(value);
      if (!func(value)) {
        throw new Error(`do not match validator ${func}`);
      }
      return value;
    });
  }

  or(func) {
    return new Parser(value => {
      try {
        return this(value);
      } catch (e) {
        return func(value);
      }
    });
  }
}

class ArrayParser extends Parser {
  constructor(func, options) {
    super(
      array => {
        if (!Array.isArray(array)) {
          throw new Error(`expected a array, got ${array}`);
        }
        return array.map(func);
      },
      options,
    );
  }
}

class ObjectParser extends Parser {
  constructor(keyToFunc, options) {
    super(
      object => {
        if (!lodash.isPlainObject(object)) {
          throw new Error(`expected a plain object, got ${object}`);
        }

        const picked = lodash.mapValues(keyToFunc, (func, key) => func(object[key]));
        return lodash.defaults(picked, object);
      },
      options,
    );
  }
}

function parse(schema, options = {}) {
  if (schema instanceof Parser) {
    return schema;
  }

  if (lodash.isFunction(schema)) {
    return new Parser(schema, options);
  }

  if (Array.isArray(schema)) {
    return new ArrayParser(parse(schema[0]), options);
  }

  if (lodash.isPlainObject(schema)) {
    return new ObjectParser(lodash.mapValues(schema, v => parse(v)), options);
  }

  throw new Error(`unknown schema type "${typeof schema}"`);
}

module.exports = parse;