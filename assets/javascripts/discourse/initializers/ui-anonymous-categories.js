import { apiInitializer } from "discourse/lib/api";
import { i18n } from "discourse-i18n";
import {
  isAnonymousCategory,
  isAnonymousPost,
  withAnonymousClass,
} from "../lib/ui-anonymous";

export default apiInitializer((api) => {
  const settings = api.container.lookup("service:site-settings");
  if (!settings.ui_anonymous_categories_enabled) {
    return;
  }

  api.addTrackedPostProperties("ui_anonymous_author");

  api.addPostClassesCallback((post) =>
    isAnonymousPost(post, settings) ? ["ui-anonymous-post"] : []
  );

  api.registerValueTransformer("topic-list-item-class", ({ value, context }) =>
    withAnonymousClass(
      value,
      isAnonymousCategory(context.topic.category_id, settings),
      "ui-anonymous-topic-row"
    )
  );

  api.decorateCookedElement(
    (element, helper) => {
      if (!isAnonymousPost(helper?.model ?? helper?.getModel?.(), settings)) {
        return;
      }
      element.classList.add("ui-anonymous-cooked");
      const titles = element.querySelectorAll("aside.quote .title");
      titles.forEach((title) => {
        title.dataset.uiAnonymousLabel = i18n("ui_anonymous_categories.quote");
      });
      return () => {
        element.classList.remove("ui-anonymous-cooked");
        titles.forEach((title) => delete title.dataset.uiAnonymousLabel);
      };
    },
    { id: "ui-anonymous-quotes", onlyStream: true }
  );

  // Scope summary/participant masking to the current topic page. onPageChange
  // also removes the class when navigating away through Discourse's SPA router.
  api.onPageChange((url) => {
    const topic = api.container.lookup("controller:topic")?.model;
    document.body.classList.toggle(
      "ui-anonymous-topic-page",
      /(^|\/)t\//.test(url) &&
        isAnonymousCategory(topic?.category_id, settings)
    );
  });
});
