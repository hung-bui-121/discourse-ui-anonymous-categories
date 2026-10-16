# frozen_string_literal: true

require "rails_helper"

RSpec.describe UiAnonymousCategories do
  fab!(:category)
  fab!(:other_category) { Fabricate(:category) }
  fab!(:author) { Fabricate(:user) }
  fab!(:other_author) { Fabricate(:user) }
  fab!(:topic) { Fabricate(:topic, category: category, user: author) }
  fab!(:first) { Fabricate(:post, topic: topic, user: author, post_number: 1) }
  fab!(:reply) { Fabricate(:post, topic: topic, user: other_author, post_number: 2) }
  fab!(:again) { Fabricate(:post, topic: topic, user: author, post_number: 3) }

  before do
    SiteSetting.ui_anonymous_categories_enabled = true
    SiteSetting.ui_anonymous_category_ids = category.id.to_s
  end

  it "only activates for selected categories" do
    expect(described_class.enabled_for?(category.id)).to eq(true)
    expect(described_class.enabled_for?(other_category.id)).to eq(false)
    SiteSetting.ui_anonymous_categories_enabled = false
    expect(described_class.enabled_for?(category.id)).to eq(false)
  end

  it "keeps the same per-topic number and marks the topic owner" do
    guardian = Guardian.new(author)
    expect(described_class.presentation(first, guardian)).to include(number: 1, op: true)
    expect(described_class.presentation(reply, guardian)).to include(number: 2, op: false)
    expect(described_class.presentation(again, guardian)).to include(number: 1, op: true)
  end

  it "keeps soft-deleted participants in the numbering" do
    reply.update_column(:deleted_at, Time.current)
    expect(described_class.presentation(reply, Guardian.new(author))[:number]).to eq(2)
  end

  it "does not change the real post owner or standard serialized username" do
    json = PostSerializer.new(first, scope: Guardian.new(author), root: false).as_json
    expect(json[:ui_anonymous_author]).to include(number: 1, op: true)
    expect(json[:username]).to eq(author.username)
    expect(first.reload.user_id).to eq(author.id)
  end
end
