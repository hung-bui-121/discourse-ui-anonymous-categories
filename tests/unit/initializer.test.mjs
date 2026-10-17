import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Run the actual initializers against a small API harness, without Ember.
const helper = new URL("../../assets/javascripts/discourse/lib/ui-anonymous.js", import.meta.url);
const i18n = (key, opts) => (opts ? `${key}${JSON.stringify(opts)}` : key);
globalThis.__uiAnonStubs = {
  "@ember/template": { htmlSafe: (html) => ({ html }) },
  "discourse/lib/api": { apiInitializer: (cb) => cb },
  "discourse/lib/avatar-utils": { tinyAvatar: (template) => `<img src='${template}'>` },
  "discourse/lib/escape": { default: (s) => String(s).replace(/</g, "&lt;") },
  "discourse/lib/formatter": { relativeAge: () => "5 mins ago" },
  "discourse/lib/icon-library": { iconHTML: (id) => `<svg ${id}>` },
  "discourse/models/composer": { EDIT: "edit" },
  "discourse-i18n": { i18n },
};

async function load(name) {
  const file = new URL(`../../assets/javascripts/discourse/initializers/${name}.js`, import.meta.url);
  const source = (await readFile(file, "utf8")).replace(
    /import\s+([\s\S]*?)\s+from\s+"([^"]+)";/g,
    (_, clause, mod) =>
      mod === "../lib/ui-anonymous"
        ? `import ${clause} from ${JSON.stringify(helper.href)};`
        : `const ${clause.startsWith("{") ? clause : `{ default: ${clause} }`} = globalThis.__uiAnonStubs[${JSON.stringify(mod)}];`
  );
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;
}

const initializers = {
  main: await load("ui-anonymous-categories"),
  composer: await load("ui-anonymous-composer"),
};

function harness(name, enabled = true) {
  const state = {};
  const settings = { ui_anonymous_categories_enabled: enabled, ui_anonymous_category_ids: "4" };
  initializers[name]({
    container: { lookup: (key) => (key === "service:site-settings" ? settings : undefined) },
    addTrackedPostProperties(...names) { state.tracked = names; },
    registerValueTransformer(key, callback) { (state.transformers ??= {})[key] = callback; },
    modifyClass(key, callback) { (state.classes ??= {})[key] = callback; },
    decorateCookedElement(callback, opts) { state.decorate = callback; state.decorateOpts = opts; },
    customizeComposerText(callbacks) { state.composerText = callbacks; },
    modifySelectKit(key) { return { replaceContent: (callback) => { state.selectKit = { key, callback }; } }; },
  });
  return state;
}

const masked = { topic: { category_id: 4 }, ui_anonymous_author: { number: 3, reply_number: 1 } };
const plain = { topic: { category_id: 5 } };

test("disabled plugin registers no UI hooks", () => {
  assert.deepEqual(harness("main", false), {});
  assert.deepEqual(harness("composer", false), {});
});

test("post and small-action class transformers mark only masked posts", () => {
  const { transformers, tracked } = harness("main");
  assert.deepEqual(tracked, ["ui_anonymous_author"]);
  for (const key of ["post-class", "post-small-action-class"]) {
    assert.deepEqual(transformers[key]({ value: ["x"], context: { post: masked } }), ["x", "ui-anonymous-post"]);
    const value = [];
    assert.equal(transformers[key]({ value, context: { post: plain } }), value);
  }
});

test("topic list and /categories latest list rows are marked", () => {
  const { transformers } = harness("main");
  for (const key of ["topic-list-item-class", "latest-topic-list-item-class"]) {
    assert.deepEqual(transformers[key]({ value: [], context: { topic: { category_id: 4 } } }), ["ui-anonymous-topic-row"]);
    assert.deepEqual(transformers[key]({ value: [], context: { topic: { category_id: 5 } } }), []);
  }
});

test("screen-reader post heading uses the pseudonym", () => {
  const { classes } = harness("main");
  const Post = classes["component:post"](class { get a11yHeadingText() { return "core"; } });
  const heading = (post) => Object.assign(new Post(), { args: { post }, a11y: { autoUpdatingRelativeDateRef: 1 } }).a11yHeadingText;
  assert.equal(
    heading({ ...masked, displayDate: "2026-01-01" }),
    i18n("post.accessible_heading", { username: i18n("ui_anonymous_categories.author", { number: 3 }), date: "5 mins ago" })
  );
  assert.equal(heading(plain), "core");
});

test("quote label is a CSS custom property on the cooked element and is cleaned up", () => {
  const state = harness("main");
  const classes = new Set();
  const style = new Map();
  const element = {
    classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v) },
    style: { setProperty: (k, v) => style.set(k, v), removeProperty: (k) => style.delete(k) },
  };
  assert.deepEqual(state.decorateOpts, { onlyStream: true });
  const cleanup = state.decorate(element, { model: masked });
  assert.equal(classes.has("ui-anonymous-cooked"), true);
  assert.equal(style.get("--ui-anonymous-quote-label"), JSON.stringify("ui_anonymous_categories.quote"));
  cleanup();
  assert.equal(classes.size + style.size, 0);
  assert.equal(state.decorate(element, { model: plain }), undefined);
});

test("composer reply header masks the replied-to avatar and name", () => {
  const { transformers } = harness("composer");
  const avatar = transformers["composer-reply-options-user-avatar-template"];
  const name = transformers["composer-reply-options-user-link-name"];
  assert.equal(avatar({ value: "/user_avatar/bob/{size}/1.png", context: { post: masked } }), "/images/avatar.png");
  assert.equal(avatar({ value: "/real", context: { post: plain } }), "/real");
  assert.equal(name({ value: "Bob", context: { post: masked } }), i18n("ui_anonymous_categories.author", { number: 3 }));
  assert.equal(name({ value: "Bob", context: { post: { topic: { category_id: 4 } } } }), "ui_anonymous_categories.generic_author");
  assert.equal(name({ value: "Bob", context: { post: plain } }), "Bob");
});

test("quote BBCode and preview avatar use the pseudonym", () => {
  const { transformers } = harness("composer");
  const params = transformers["quote-params"];
  const post = { ...masked, username: "realbob" };
  const value = ["Real Bob", "post:5", "topic:9", "full:true", "username:realbob"];
  assert.deepEqual(params({ value, context: { post, opts: {} } }), [
    i18n("ui_anonymous_categories.author", { number: 3 }), "post:5", "topic:9", "full:true",
  ]);
  assert.deepEqual(params({ value, context: { post, opts: { username: "realbob" } } })[0], i18n("ui_anonymous_categories.author", { number: 3 }));
  // Nested quote of another author inside the masked post.
  assert.deepEqual(params({ value: ["carol", "post:2", "topic:7"], context: { post, opts: { username: "carol" } } }), [
    "ui_anonymous_categories.generic_author", "post:2", "topic:7",
  ]);
  assert.equal(params({ value, context: { post: plain, opts: {} } }), value);

  const avatar = transformers["composer-editor-quoted-post-avatar-template"];
  assert.equal(avatar({ value: "/real", context: { post: masked } }), "/images/avatar.png");
  assert.equal(avatar({ value: "/real", context: { post: plain } }), "/real");
});

test("desktop edit title masks the replied-to user", () => {
  const { composerText } = harness("composer");
  const replyOptions = {
    postLink: { href: "/t/x/9/5", anchor: "post #5" },
    userAvatar: "<img src='/images/avatar.png'>",
    userLink: { anchor: "Anonymous #3" },
    originalUser: { username: "realbob", avatar: "<img src='/real'>" },
  };
  const title = composerText.actionTitle({ action: "edit", post: masked, replyOptions }).html;
  assert.match(title, /post #5/);
  assert.match(title, /ui_anonymous_categories\.author\{"number":1\}/);
  assert.doesNotMatch(title, /realbob|\/real'/);
  assert.equal(composerText.actionTitle({ action: "reply", post: masked, replyOptions }), undefined);
  assert.equal(composerText.actionTitle({ action: "edit", post: plain, replyOptions }), undefined);
  assert.equal(composerText.actionTitle({ action: "edit", post: masked, replyOptions: { ...replyOptions, originalUser: null } }), undefined);
});

test("composer actions menu masks 'reply to a post by' for masked topics only", () => {
  const { selectKit } = harness("composer");
  assert.equal(selectKit.key, "composer-actions");
  const content = [{ id: "reply_to_post", name: "Reply to a post by bob" }, { id: "toggle_whisper", name: "Whisper" }];
  const [reply, whisper] = selectKit.callback({ post: masked, topic: { id: 1, ...masked.topic } }, content);
  assert.equal(reply.name, i18n("composer.composer_actions.reply_to_post.label", { postUsername: i18n("ui_anonymous_categories.author", { number: 3 }) }));
  assert.equal(whisper, content[1]);
  // A different topic resets the snapshot, like core.
  assert.equal(
    selectKit.callback({ post: null, topic: { id: 2, category_id: 4 } }, content)[0].name,
    i18n("composer.composer_actions.reply_to_post.label", { postUsername: "ui_anonymous_categories.generic_author" })
  );
  assert.equal(selectKit.callback({ post: plain, topic: plain.topic }, content), content);
});

test("composer actions menu keeps masking core's post snapshot after @post is cleared", () => {
  const { selectKit } = harness("composer");
  const content = [{ id: "reply_to_post", name: "Reply to a post by bob" }];
  const expected = i18n("composer.composer_actions.reply_to_post.label", {
    postUsername: i18n("ui_anonymous_categories.author", { number: 3 }),
  });
  selectKit.callback({ post: masked, topic: { id: 9, ...masked.topic } }, content);
  // "Reply as linked topic" / "+ New Topic": core still shows the snapshot.
  assert.equal(selectKit.callback({ post: null, topic: null }, content)[0].name, expected);
});
