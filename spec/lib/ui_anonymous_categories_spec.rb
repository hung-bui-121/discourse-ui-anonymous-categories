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

  it "numbers by the first regular post, ignoring earlier whispers and small actions" do
    late = Fabricate(:user)
    Fabricate(:whisper, topic: topic, user: late, post_number: 4)
    Fabricate(:small_action, topic: topic, user: late, post_number: 5)
    regular = Fabricate(:post, topic: topic, user: late, post_number: 6)
    guardian = Guardian.new(author)

    expect(described_class.presentation(regular, guardian)[:number]).to eq(6)
    expect(described_class.presentation(reply, guardian)[:number]).to eq(2)
  end

  it "numbers moderator action posts like regular posts" do
    moderator = Fabricate(:moderator)
    action = Fabricate(:post, topic: topic, user: moderator, post_number: 4, post_type: Post.types[:moderator_action])
    later = Fabricate(:post, topic: topic, user: moderator, post_number: 5)
    guardian = Guardian.new(author)

    expect(described_class.presentation(action, guardian)[:number]).to eq(4)
    expect(described_class.presentation(later, guardian)[:number]).to eq(4)
  end

  it "uses reply_to_user_id for the replied-to number" do
    reply.update_column(:reply_to_user_id, author.id)
    expect(described_class.presentation(reply, Guardian.new(author))[:reply_number]).to eq(1)
    expect(described_class.presentation(first, Guardian.new(author))[:reply_number]).to be_nil
  end

  it "gives each post of a deleted user its own number" do
    first.update_column(:user_id, nil)
    again.update_column(:user_id, nil)
    reply.update_column(:reply_to_user_id, nil)
    guardian = Guardian.new(other_author)

    expect(described_class.presentation(first.reload, guardian)).to include(number: 1, op: false)
    expect(described_class.presentation(again.reload, guardian)).to include(number: 3, op: false)
    expect(described_class.presentation(reply.reload, guardian)[:reply_number]).to be_nil
  end

  it "does not change the real post owner or standard serialized username" do
    json = PostSerializer.new(first, scope: Guardian.new(author), root: false).as_json
    expect(json[:ui_anonymous_author]).to include(number: 1, op: true)
    expect(json[:username]).to eq(author.username)
    expect(first.reload.user_id).to eq(author.id)
  end
end
