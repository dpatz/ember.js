import {
  alias,
  defineProperty,
  get,
  set,
  meta,
  isWatching,
  addObserver,
  removeObserver,
  tagFor
} from '..';

let obj, count;

QUnit.module('ember-metal/alias', {
  beforeEach() {
    obj = { foo: { faz: 'FOO' } };
    count = 0;
  },
  afterEach() {
    obj = null;
  }
});

function incrementCount() {
  count++;
}

QUnit.test('should proxy get to alt key', function(assert) {
  defineProperty(obj, 'bar', alias('foo.faz'));
  assert.equal(get(obj, 'bar'), 'FOO');
});

QUnit.test('should proxy set to alt key', function(assert) {
  defineProperty(obj, 'bar', alias('foo.faz'));
  set(obj, 'bar', 'BAR');
  assert.equal(get(obj, 'foo.faz'), 'BAR');
});

QUnit.test('old dependent keys should not trigger property changes', function(assert) {
  let obj1 = Object.create(null);
  defineProperty(obj1, 'foo', null, null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));
  defineProperty(obj1, 'baz', alias('bar')); // redefine baz
  addObserver(obj1, 'baz', incrementCount);

  set(obj1, 'foo', 'FOO');
  assert.equal(count, 1);

  removeObserver(obj1, 'baz', incrementCount);

  set(obj1, 'foo', 'OOF');
  assert.equal(count, 1);
});

QUnit.test(`inheriting an observer of the alias from the prototype then
            redefining the alias on the instance to another property dependent on same key
            does not call the observer twice`, function(assert) {
  let obj1 = Object.create(null);

  meta(obj1).proto = obj1;

  defineProperty(obj1, 'foo', null, null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));
  addObserver(obj1, 'baz', incrementCount);

  let obj2 = Object.create(obj1);
  defineProperty(obj2, 'baz', alias('bar')); // override baz

  set(obj2, 'foo', 'FOO');
  assert.equal(count, 1);

  removeObserver(obj2, 'baz', incrementCount);

  set(obj2, 'foo', 'OOF');
  assert.equal(count, 1);
});

QUnit.test('an observer of the alias works if added after defining the alias', function(assert) {
  defineProperty(obj, 'bar', alias('foo.faz'));
  addObserver(obj, 'bar', incrementCount);
  assert.ok(isWatching(obj, 'foo.faz'));
  set(obj, 'foo.faz', 'BAR');
  assert.equal(count, 1);
});

QUnit.test('an observer of the alias works if added before defining the alias', function(assert) {
  addObserver(obj, 'bar', incrementCount);
  defineProperty(obj, 'bar', alias('foo.faz'));
  assert.ok(isWatching(obj, 'foo.faz'));
  set(obj, 'foo.faz', 'BAR');
  assert.equal(count, 1);
});

QUnit.test('object with alias is dirtied if interior object of alias is set after consumption', function(assert) {
  defineProperty(obj, 'bar', alias('foo.faz'));
  get(obj, 'bar');

  let tag = tagFor(obj);
  let tagValue = tag.value();
  set(obj, 'foo.faz', 'BAR');

  assert.ok(!tag.validate(tagValue), 'setting the aliased key should dirty the object');
});

QUnit.test('setting alias on self should fail assertion', function() {
  expectAssertion(() => defineProperty(obj, 'bar', alias('bar')), 'Setting alias \'bar\' on self');
});
