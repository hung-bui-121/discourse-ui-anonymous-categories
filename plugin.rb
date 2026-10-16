# frozen_string_literal: true

# name: discourse-ui-anonymous-categories
# about: Per-topic pseudonyms in selected categories, for the web UI only.
# version: 0.1.0
# authors: MPS
# required_version: 2026.1.4

enabled_site_setting :ui_anonymous_categories_enabled
register_asset "stylesheets/ui-anonymous.scss"

after_initialize do
  require_relative "lib/ui_anonymous_categories"

  add_to_serializer(
    :post,
    :ui_anonymous_author,
    include_condition: -> { ::UiAnonymousCategories.enabled_for?(object.topic&.category_id) },
  ) { ::UiAnonymousCategories.presentation(object, scope) }
end
