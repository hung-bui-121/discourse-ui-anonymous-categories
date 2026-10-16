# Discourse UI Anonymous Categories

Plugin 0.2.0 — shows authors anonymously in selected categories while keeping
the real accounts untouched.

## Enabling

1. Create a category as usual, e.g. **Confessions**.
2. Install the plugin and restart/rebuild Discourse.
3. Go to **Admin → Settings** and search for `ui_anonymous`.
4. Enable `ui_anonymous_categories_enabled` and pick categories in
   `ui_anonymous_category_ids`.
5. Reload the browser. Subcategories must be selected individually.

Discourse's built-in Anonymous Mode is not required. Do not combine this with
another plugin that reassigns real authors to anonymous accounts in the same
category.

## Behavior

- Applies to new topics, replies and existing posts. Authors in the database
  are never changed.
- The post author header uses a shared avatar, with no profile link/user card
  and no account title/badge/flair. Admins see the same UI.
- The topic author gets an **OP** label.
- A person keeps the same number within a topic. The number is the post number
  of that person's first regular (or moderator-action) post in the topic: A
  writes posts #1 and #3 → both are Anonymous #1; B writes post #2 →
  Anonymous #2. Numbers can therefore be non-consecutive. Whispers and small
  actions (closed, pinned, ...) do not affect numbering.
- Numbers are computed per topic and may coincide across topics. Do not use
  them as a forum-wide identifier.
- The reply-to name/avatar is replaced; the button that expands the parent post
  still works, and embedded parent/reply posts are masked too.
- The composer header when replying to or editing a masked post shows the
  pseudonym and a default avatar, including the "Reply to a post by …" entry
  in the composer actions menu.
- Small action posts hide the acting user's avatar.
- Quote headers show "Quote"; the quote body is kept as is.
- Standard topic lists (including the latest list on /categories) hide posters;
  the topic map hides participants and the authors of most-liked replies,
  including the mobile pop-ups.
- Screen-reader labels of masked posts (post heading, embedded replies) use
  the pseudonym.
- The core highlight of moderator-action posts is removed so it does not reveal
  staff authorship.
- Edit/delete/like/flag are still handled by Discourse with the real account.
- Unselecting a category or disabling the plugin and reloading shows the real
  information again.
- No new tables, no migrations, no fake accounts.

## Self-hosted installation

Do not upload a ZIP via the Themes page — this is a **server plugin**.

Add the repository to the **existing plugins block** in
`/var/discourse/containers/app.yml` (keep your current plugins):

```yaml
hooks:
  after_code:
    - exec:
        cd: $home/plugins
        cmd:
          - git clone https://github.com/hung-bui-121/discourse-ui-anonymous-categories.git
```

If you host a fork in a private repository, use your usual deploy key
mechanism. Then:

```bash
cd /var/discourse
./launcher rebuild app
```

Use your actual container name if it is not `app`.

### Trying it from a local folder (not for long-term deployments)

For a development/source checkout, copy the plugin folder to
`DISCOURSE_SOURCE/plugins/discourse-ui-anonymous-categories` and restart the
server and the frontend dev server. `DISCOURSE_SOURCE` is your actual Discourse
checkout.

Discourse managed hosting can only install it if your plan allows custom plugins.

## UI scope, not identity protection

JSON/API, DOM data attributes, HTML/raw/quote metadata, profile/activity,
search, notifications, email/digest, RSS, revision history, user-typed content
such as @mentions/signatures, custom small action messages, and the list of
users who liked a post may still reveal the real account. Quoting a post
inserts the real username into the raw text, so the composer preview's quote
header shows it. Plugins with their own UI (Reactions, Topic List Previews,
signatures, chat, ...) may need extra work. No identity masking is promised on
these surfaces. Other themes/components may render authors outside the standard
UI.

Core adds classes such as `group-<name>`, `category-moderator` and `moderator`
to posts; plugins cannot remove them. Core CSS does not style them visibly
(the moderator highlight is neutralized), but a theme might.

Topic-map masking relies on core rendering the `topic-map-expanded-after`
outlet; a theme that replaces the whole topic map may bypass it.

Do not use this plugin if you need to guarantee identity confidentiality
against technically savvy users. Moving a topic out of a selected category
reveals its authors after a reload. Soft deletes do not change numbers;
permanently deleting a person's first numbered post may change their number.
After moving categories or changing settings, reload open tabs to keep the
display consistent.

## Compatibility and testing

APIs/outlets were checked against the source of **Discourse v2026.1.4**:

- Plugin outlets: `post-avatar`, `post-meta-data-poster-name`,
  `post-meta-data-reply-to-tab-info`, `topic-list-item-mobile-avatar`,
  `topic-map-expanded-after`.
- Value transformers: `post-class`, `post-small-action-class`,
  `topic-list-item-class`, `latest-topic-list-item-class`,
  `composer-reply-options-user-avatar-template`,
  `composer-reply-options-user-link-name`.
- Plugin API: `addTrackedPostProperties`, `decorateCookedElement`,
  `customizeComposerText`, `modifySelectKit("composer-actions")`,
  `modifyClass("component:post")`.

Reference source: [Discourse v2026.1.4](https://github.com/discourse/discourse/tree/v2026.1.4).
Older versions are not targeted.

Frontend helper tests, no dependencies needed:

```bash
npm test
```

In a Discourse checkout with Ruby/bundle/database:

```bash
LOAD_PLUGINS=1 bundle exec rspec plugins/discourse-ui-anonymous-categories/spec
```

Verified for 0.2.0: **18/18 Node tests pass**; SCSS compiles; Ruby files parse;
YAML is valid. The Rails specs are provided to run inside Discourse but have not
been run on a real Discourse server yet. Integration and mobile/theme behavior
have not been confirmed in a browser. Do not consider 0.2.0 production-tested.

### Quick check after installing

1. Pick a test category; use two accounts A/B to post a topic and a few
   interleaved replies.
2. Check names/avatars/OP; clicking a name or avatar does not open a user card.
3. Reply to B's post: the reply-to name is a pseudonym, the expand button still
   works, and the composer header shows the pseudonym.
4. Quote a post: the quote header no longer shows the real name/avatar.
5. Check Latest, the category list, /categories and mobile: no poster avatars on
   topics in selected categories.
6. Open the topic map (desktop and mobile): no participant avatars or
   most-liked authors.
7. Close/pin the topic as a moderator: the small action shows no avatar.
8. Go to another category and back: real/anonymous display matches the scope.
9. Try old posts, soft-deleted posts, new replies arriving in realtime, and
   edit/delete/flag permissions.
10. Try the themes/components/plugins enabled on your forum.
11. Disable the plugin and reload: real authors reappear and ownership is
    unchanged.

## License

MIT, see LICENSE.
