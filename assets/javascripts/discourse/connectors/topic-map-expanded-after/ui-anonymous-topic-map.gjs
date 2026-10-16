import Component from "@glimmer/component";
import { service } from "@ember/service";
import bodyClass from "discourse/helpers/body-class";
import { isAnonymousCategory } from "../../lib/ui-anonymous";

// Set while a masked topic map (in-post or bottom) is rendered, in the same
// render pass. A body class because mobile opens the map's menus in a modal.
export default class UiAnonymousTopicMap extends Component {
  @service siteSettings;

  get masked() {
    return isAnonymousCategory(this.args.outletArgs.topic?.category_id, this.siteSettings);
  }

  <template>
    {{#if this.masked}}
      {{bodyClass "ui-anonymous-topic-page"}}
    {{/if}}
  </template>
}
