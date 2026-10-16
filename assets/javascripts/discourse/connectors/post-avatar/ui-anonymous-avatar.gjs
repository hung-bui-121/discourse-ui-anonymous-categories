import Component from "@glimmer/component";
import { service } from "@ember/service";
import { i18n } from "discourse-i18n";
import { isAnonymousPost } from "../../lib/ui-anonymous";

export default class UiAnonymousAvatar extends Component {
  @service siteSettings;

  get masked() {
    return isAnonymousPost(this.args.outletArgs.post, this.siteSettings);
  }

  <template>
    {{#if this.masked}}
      <span class="ui-anonymous-avatar" role="img" aria-label={{i18n "ui_anonymous_categories.avatar"}}>
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <circle cx="24" cy="17" r="8" />
          <path d="M9 41v-4a15 15 0 0 1 30 0v4Z" />
        </svg>
      </span>
    {{else}}
      {{yield}}
    {{/if}}
  </template>
}
