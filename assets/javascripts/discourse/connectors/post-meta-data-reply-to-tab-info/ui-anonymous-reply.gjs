import Component from "@glimmer/component";
import { service } from "@ember/service";
import { i18n } from "discourse-i18n";
import { isAnonymousPost } from "../../lib/ui-anonymous";

export default class UiAnonymousReply extends Component {
  @service siteSettings;

  get masked() {
    return isAnonymousPost(this.args.outletArgs.post, this.siteSettings);
  }

  get label() {
    const number = this.args.outletArgs.post.ui_anonymous_author?.reply_number;
    return number
      ? i18n("ui_anonymous_categories.author", { number })
      : i18n("ui_anonymous_categories.generic_author");
  }

  <template>
    {{#if this.masked}}
      <span class="ui-anonymous-reply">{{this.label}}</span>
    {{else}}
      {{yield}}
    {{/if}}
  </template>
}
