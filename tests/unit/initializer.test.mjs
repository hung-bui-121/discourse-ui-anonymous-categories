import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Run the actual initializer against a small API harness, without Ember.
const file = new URL("../../assets/javascripts/discourse/initializers/ui-anonymous-categories.js", import.meta.url);
const helper = new URL("../../assets/javascripts/discourse/lib/ui-anonymous.js", import.meta.url);
const source = (await readFile(file, "utf8"))
  .replace('import { apiInitializer } from "discourse/lib/api";', 'const apiInitializer = (cb) => cb;')
  .replace('import { i18n } from "discourse-i18n";', 'const i18n = (key) => key;')
  .replace('"../lib/ui-anonymous"', JSON.stringify(helper.href));
const initialize = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;

function harness(enabled = true) {
  const state = {};
  const settings = { ui_anonymous_categories_enabled: enabled, ui_anonymous_category_ids: "4" };
  initialize({
    container: { lookup(name) { return name === "service:site-settings" ? settings : { model: { category_id: 4 } }; } },
    addTrackedPostProperties(...names) { state.tracked = names; },
    addPostClassesCallback(callback) { state.postClass = callback; },
    registerValueTransformer(name, callback) { state.topicClass = callback; },
    decorateCookedElement(callback) { state.decorate = callback; },
    onPageChange(callback) { state.pageChange = callback; },
  });
  return state;
}

test("disabled plugin registers no UI hooks", () => {
  assert.deepEqual(harness(false), {});
});

test("modern decorator helper.model masks quote header and cleans up", () => {
  const state = harness();
  const classes = new Set();
  const title = { dataset: {} };
  const element = {
    classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v) },
    querySelectorAll: () => [title],
  };
  const cleanup = state.decorate(element, { model: { category_id: 4 } });
  assert.equal(classes.has("ui-anonymous-cooked"), true);
  assert.equal(title.dataset.uiAnonymousLabel, "ui_anonymous_categories.quote");
  cleanup();
  assert.equal(classes.size, 0);
  assert.deepEqual(title.dataset, {});
  assert.equal(state.decorate(element, { model: { category_id: 5 } }), undefined);
  assert.deepEqual(state.tracked, ["ui_anonymous_author"]);
});

test("topic-page participant masking is removed on SPA navigation away", () => {
  const state = harness();
  const toggles = [];
  const previous = globalThis.document;
  globalThis.document = { body: { classList: { toggle: (name, active) => toggles.push([name, active]) } } };
  try {
    state.pageChange("/t/example/123");
    state.pageChange("/latest");
    assert.deepEqual(toggles, [["ui-anonymous-topic-page", true], ["ui-anonymous-topic-page", false]]);
  } finally {
    globalThis.document = previous;
  }
});
