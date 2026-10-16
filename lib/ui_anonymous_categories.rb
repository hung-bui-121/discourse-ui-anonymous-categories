# frozen_string_literal: true

module ::UiAnonymousCategories
  def self.enabled_for?(category_id)
    SiteSetting.ui_anonymous_categories_enabled && category_id.present? &&
      SiteSetting.ui_anonymous_category_ids.to_s.split("|").include?(category_id.to_s)
  end

  def self.presentation(post, guardian)
    # Memoize only on this request's Guardian. No shared cache or user mutations.
    cache = guardian.instance_variable_get(:@ui_anonymous_categories_numbers)
    unless cache
      cache = {}
      guardian.instance_variable_set(:@ui_anonymous_categories_numbers, cache)
    end

    # A user's number is their first post number in this topic. Include soft
    # deleted/hidden posts so moderation does not renumber other participants.
    # At most one grouped SQL query per topic per Guardian/request.
    numbers = cache[post.topic_id] ||=
      Post.unscoped.where(topic_id: post.topic_id).group(:user_id).minimum(:post_number)

    {
      number: numbers[post.user_id] || post.post_number,
      op: post.user_id.present? && post.user_id == post.topic.user_id,
      reply_number: numbers[post.reply_to_user&.id],
    }
  end
end
