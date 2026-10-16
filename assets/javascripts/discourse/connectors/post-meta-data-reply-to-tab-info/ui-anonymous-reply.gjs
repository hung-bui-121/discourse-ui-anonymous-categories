import Component from "@glimmer/component";
import { service } from "@ember/service";
import { i18n } from "discourse-i18n";
import { isAnonymousPost, pseudonym } from "../../lib/ui-anonymous";

export default class UiAnonymousReply extends Component {
  @service siteSettings;

  get masked() {
    return isAnonymousPost(this.args.outletArgs.post, this.siteSettings);
  }

  get label() {
    return pseudonym(this.args.outletArgs.post.ui_anonymous_author?.reply_number, i18n);
  }

  <template>
    {{#if this.masked}}
      <span class="ui-anonymous-reply">{{this.label}}</span>
    {{else}}
      {{yield}}
    {{/if}}
  </template>
}
