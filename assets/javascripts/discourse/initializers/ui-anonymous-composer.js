import { htmlSafe } from "@ember/template";
import { apiInitializer } from "discourse/lib/api";
import { tinyAvatar } from "discourse/lib/avatar-utils";
import escape from "discourse/lib/escape";
import { iconHTML } from "discourse/lib/icon-library";
import { EDIT } from "discourse/models/composer";
import { i18n } from "discourse-i18n";
import {
  isAnonymousCategory,
  isAnonymousPost,
  MASKED_AVATAR_TEMPLATE,
  pseudonym,
} from "../lib/ui-anonymous";

// Composer header for replies/edits of masked posts.
export default apiInitializer((api) => {
  const settings = api.container.lookup("service:site-settings");
  if (!settings.ui_anonymous_categories_enabled) {
    return;
  }

  const masked = (post) => isAnonymousPost(post, settings);
  const label = (post) => pseudonym(post?.ui_anonymous_author?.number, i18n);

  api.registerValueTransformer(
    "composer-reply-options-user-avatar-template",
    ({ value, context }) => (masked(context.post) ? MASKED_AVATAR_TEMPLATE : value)
  );
  api.registerValueTransformer(
    "composer-reply-options-user-link-name",
    ({ value, context }) => (masked(context.post) ? label(context.post) : value)
  );

  // Quote BBCode [quote="name, post:N, topic:N(, username:x)"]: put the
  // pseudonym in the raw, so the editor, preview and saved post never contain
  // the real name. Quoting a nested quote (opts.username) refers to another
  // author, so it gets the generic label.
  api.registerValueTransformer("quote-params", ({ value, context }) => {
    const { post, opts } = context;
    if (!masked(post)) {
      return value;
    }
    const nested = opts?.username && opts.username !== post.username;
    const name = nested ? pseudonym(null, i18n) : label(post);
    return [name, ...value.slice(1).filter((param) => !String(param).startsWith("username:"))];
  });
  api.registerValueTransformer(
    "composer-editor-quoted-post-avatar-template",
    ({ value, context }) => (masked(context.post) ? MASKED_AVATAR_TEMPLATE : value)
  );

  // Desktop edit title also shows the replied-to user (replyOptions.originalUser),
  // which has no transformer. Same markup as core, masked.
  api.customizeComposerText({
    actionTitle(model) {
      const opts = model.replyOptions;
      if (
        model.action !== EDIT ||
        !masked(model.post) ||
        !opts?.originalUser ||
        !opts.userAvatar ||
        !opts.userLink ||
        !opts.postLink
      ) {
        return;
      }
      const replyLabel = pseudonym(model.post.ui_anonymous_author?.reply_number, i18n);
      return htmlSafe(`
        <a class="post-link" href="${opts.postLink.href}">${opts.postLink.anchor}</a>
        ${opts.userAvatar}
        <span class="username">${escape(opts.userLink.anchor)}</span>
        ${iconHTML("share", { class: "reply-to-glyph" })}
        ${tinyAvatar(MASKED_AVATAR_TEMPLATE)}
        <span class="original-username">${escape(replyLabel)}</span>
      `);
    },
  });

  // "Reply to a post by %{postUsername}" in the composer actions menu. Core
  // labels it from a module-level post snapshot that outlives @post (e.g. after
  // switching to "reply as linked topic"), so mirror that snapshot here.
  let snapshotTopicId = null;
  let snapshotPost = null;
  api.modifySelectKit("composer-actions").replaceContent((component, content) => {
    if (component.topic && component.topic.id !== snapshotTopicId) {
      snapshotTopicId = component.topic.id;
      snapshotPost = component.post;
    }
    if (component.post) {
      snapshotPost = component.post;
    }
    const post = snapshotPost;
    if (!masked(post) && !isAnonymousCategory(component.topic?.category_id, settings)) {
      return content;
    }
    const postUsername = label(post);
    return content.map((item) =>
      item.id === "reply_to_post"
        ? { ...item, name: i18n("composer.composer_actions.reply_to_post.label", { postUsername }) }
        : item
    );
  });
});
