import Component from "@glimmer/component";
import { service } from "@ember/service";
import { i18n } from "discourse-i18n";
import { isAnonymousPost, pseudonym } from "../../lib/ui-anonymous";

export default class UiAnonymousName extends Component {
  @service siteSettings;

  get masked() {
    return isAnonymousPost(this.args.outletArgs.post, this.siteSettings);
  }

  get label() {
    return pseudonym(this.args.outletArgs.post.ui_anonymous_author?.number, i18n);
  }

  get op() {
    return this.args.outletArgs.post.ui_anonymous_author?.op;
  }

  <template>
    {{#if this.masked}}
      <span class="ui-anonymous-name">{{this.label}}</span>
      {{#if this.op}}
        <span class="ui-anonymous-op">{{i18n "ui_anonymous_categories.op"}}</span>
      {{/if}}
    {{else}}
      {{yield}}
    {{/if}}
  </template>
}
