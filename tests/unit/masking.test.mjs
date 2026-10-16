import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryIds, isAnonymousCategory, isAnonymousPost, maskEmbeddedReplyLabels, pseudonym, withAnonymousClass,
} from "../../assets/javascripts/discourse/lib/ui-anonymous.js";

const settings = {
  ui_anonymous_categories_enabled: true,
  ui_anonymous_category_ids: "4|12",
};

test("category picker handles strings, arrays, empty and invalid values", () => {
  assert.deepEqual([...categoryIds(settings)], [4, 12]);
  assert.deepEqual([...categoryIds({ ui_anonymous_category_ids: [4, "12"] })], [4, 12]);
  assert.deepEqual([...categoryIds({ ui_anonymous_category_ids: "|x|0|-1|2.2" })], []);
  assert.deepEqual([...categoryIds({})], []);
});

test("only explicitly selected categories are masked", () => {
  assert.equal(isAnonymousCategory(4, settings), true);
  assert.equal(isAnonymousCategory("12", settings), true);
  assert.equal(isAnonymousCategory(5, settings), false);
  assert.equal(isAnonymousCategory(null, settings), false);
});

test("global disable wins over both category and serialized metadata", () => {
  const disabled = { ...settings, ui_anonymous_categories_enabled: false };
  assert.equal(isAnonymousPost({ topic: { category_id: 4 }, ui_anonymous_author: { number: 1 } }, disabled), false);
});

test("topic category wins over stale post metadata after a move", () => {
  assert.equal(isAnonymousPost({ topic: { category_id: 5 }, ui_anonymous_author: { number: 1 } }, settings), false);
});

test("post stream and standalone reply previews are both supported", () => {
  assert.equal(isAnonymousPost({ topic: { category_id: 4 } }, settings), true);
  assert.equal(isAnonymousPost({ category_id: 12 }, settings), true);
  assert.equal(isAnonymousPost({ ui_anonymous_author: { number: 2 } }, settings), true);
  assert.equal(isAnonymousPost({}, settings), false);
  assert.equal(isAnonymousPost(null, settings), false);
});

test("class transformer preserves other plugins' classes without mutation", () => {
  const original = ["pinned", "custom"];
  assert.deepEqual(withAnonymousClass(original, true, "anonymous"), ["pinned", "custom", "anonymous"]);
  assert.deepEqual(original, ["pinned", "custom"]);
  assert.equal(withAnonymousClass(original, false, "anonymous"), original);
  assert.deepEqual(withAnonymousClass(undefined, true, "anonymous"), ["anonymous"]);
});

test("category ids are memoized on the raw setting value", () => {
  const ids = categoryIds(settings);
  assert.equal(categoryIds({ ...settings }), ids);
  const changed = categoryIds({ ui_anonymous_category_ids: "4|13" });
  assert.notEqual(changed, ids);
  assert.deepEqual([...changed], [4, 13]);
  assert.equal(categoryIds({ ui_anonymous_category_ids: [4, 13] }), changed);
});

test("pseudonym falls back to the generic label without a number", () => {
  const t = (key, opts) => `${key}:${opts?.number ?? ""}`;
  assert.equal(pseudonym(2, t), "ui_anonymous_categories.author:2");
  assert.equal(pseudonym(undefined, t), "ui_anonymous_categories.generic_author:");
});

function fakeReply({ isReply = true, region = true } = {}) {
  const attrs = {};
  const link = { setAttribute: (k, v) => (attrs.link = v) };
  const reply = {
    classList: { contains: (c) => isReply && c === "reply" },
    getAttribute: (k) => (k === "role" && region ? "region" : null),
    setAttribute: (k, v) => (attrs[k] = v),
    closest: () => ({ dataset: { postNumber: "7" } }),
    querySelector: () => link,
  };
  const avatar = { closest: () => ({ parentElement: { parentElement: reply } }) };
  return { avatar, attrs };
}

test("embedded reply aria-labels use the pseudonym, main posts are untouched", () => {
  const t = (key, opts) => `${key}${JSON.stringify(opts)}`;
  const { avatar, attrs } = fakeReply();
  maskEmbeddedReplyLabels(avatar, "Anonymous #3", t);
  assert.equal(attrs["aria-label"], t("post.sr_embedded_reply_description", { post_number: "7", username: "Anonymous #3" }));
  assert.equal(attrs.link, t("topic.jump_reply_aria", { username: "Anonymous #3" }));

  const above = fakeReply({ region: false });
  maskEmbeddedReplyLabels(above.avatar, "Anonymous #3", t);
  assert.deepEqual(Object.keys(above.attrs), ["link"]);

  const main = fakeReply({ isReply: false });
  maskEmbeddedReplyLabels(main.avatar, "Anonymous #3", t);
  assert.deepEqual(main.attrs, {});
});
