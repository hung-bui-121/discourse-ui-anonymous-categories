// Core's static default avatar: neutral, always served, works with avatarUrl().
export const MASKED_AVATAR_TEMPLATE = "/images/avatar.png";

let cachedIds = { key: null, ids: new Set() };

export function categoryIds(settings) {
  const value = settings.ui_anonymous_category_ids;
  const key = Array.isArray(value) ? value.join("|") : String(value || "");
  if (cachedIds.key !== key) {
    const ids = key.split("|").map(Number).filter((id) => Number.isInteger(id) && id > 0);
    cachedIds = { key, ids: new Set(ids) };
  }
  return cachedIds.ids;
}

export function isAnonymousCategory(categoryId, settings) {
  return Boolean(
    settings.ui_anonymous_categories_enabled &&
      categoryIds(settings).has(Number(categoryId))
  );
}

export function isAnonymousPost(post, settings) {
  if (!post || !settings.ui_anonymous_categories_enabled) {
    return false;
  }
  const categoryId = post.topic?.category_id ?? post.category_id;
  if (categoryId != null) {
    return isAnonymousCategory(categoryId, settings);
  }
  // Single-post/reply previews can lack their parent topic model.
  return Boolean(post.ui_anonymous_author);
}

export function withAnonymousClass(value, masked, className) {
  const classes = Array.isArray(value) ? value : value ? [value] : [];
  return masked ? [...classes, className] : value;
}

export function pseudonym(number, t) {
  return number
    ? t("ui_anonymous_categories.author", { number })
    : t("ui_anonymous_categories.generic_author");
}

// Embedded replies put the real username in their region/jump-link aria-labels
// and have no outlet there. `element` is a node in the reply's avatar column.
export function maskEmbeddedReplyLabels(element, label, t) {
  const reply = element.closest(".topic-avatar")?.parentElement?.parentElement;
  if (!reply?.classList.contains("reply")) {
    return;
  }
  if (reply.getAttribute("role") === "region") {
    const postNumber = reply.closest("[data-post-number]")?.dataset.postNumber;
    reply.setAttribute(
      "aria-label",
      t("post.sr_embedded_reply_description", { post_number: postNumber, username: label })
    );
  }
  reply
    .querySelector(".post-link-arrow .post-info")
    ?.setAttribute("aria-label", t("topic.jump_reply_aria", { username: label }));
}
