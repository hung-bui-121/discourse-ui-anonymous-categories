export function categoryIds(settings) {
  const value = settings.ui_anonymous_category_ids;
  const values = Array.isArray(value) ? value : String(value || "").split("|");
  return new Set(values.map(Number).filter((id) => Number.isInteger(id) && id > 0));
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
