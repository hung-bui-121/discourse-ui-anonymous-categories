# frozen_string_literal: true

module ::UiAnonymousCategories
  # Post types visible to everyone that count toward numbering. Moderator
  # action posts are included so staff keep one stable number per topic.
  NUMBERED_POST_TYPES = %i[regular moderator_action].freeze

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

    # A user's number is their first regular/moderator-action post number in
    # this topic, so whispers and small actions do not shift it. Include soft deleted/hidden
    # posts so moderation does not renumber other participants.
    # At most one grouped SQL query per topic per Guardian/request.
    numbers = cache[post.topic_id] ||=
      Post
        .unscoped
        .where(topic_id: post.topic_id, post_type: NUMBERED_POST_TYPES.map { |t| Post.types[t] })
        .group(:user_id)
        .minimum(:post_number)

    # Posts of deleted users (nil user_id) must not share one number.
    {
      number: post.user_id ? (numbers[post.user_id] || post.post_number) : post.post_number,
      op: post.user_id.present? && post.user_id == post.topic.user_id,
      reply_number: post.reply_to_user_id && numbers[post.reply_to_user_id],
    }
  end
end
