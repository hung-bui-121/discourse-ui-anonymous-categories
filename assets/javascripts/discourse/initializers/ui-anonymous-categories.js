import { apiInitializer } from "discourse/lib/api";
import { relativeAge } from "discourse/lib/formatter";
import { i18n } from "discourse-i18n";
import {
  isAnonymousCategory,
  isAnonymousPost,
  pseudonym,
  withAnonymousClass,
} from "../lib/ui-anonymous";

const QUOTE_LABEL_VAR = "--ui-anonymous-quote-label";

export default apiInitializer((api) => {
  const settings = api.container.lookup("service:site-settings");
  if (!settings.ui_anonymous_categories_enabled) {
    return;
  }

  const masked = (post) => isAnonymousPost(post, settings);
  const postClass = ({ value, context }) =>
    withAnonymousClass(value, masked(context.post), "ui-anonymous-post");
  const topicClass = ({ value, context }) =>
    withAnonymousClass(
      value,
      isAnonymousCategory(context.topic?.category_id, settings),
      "ui-anonymous-topic-row"
    );

  api.addTrackedPostProperties("ui_anonymous_author");

  api.registerValueTransformer("post-class", postClass);
  api.registerValueTransformer("post-small-action-class", postClass);
  api.registerValueTransformer("topic-list-item-class", topicClass);
  api.registerValueTransformer("latest-topic-list-item-class", topicClass);

  // The visually hidden post heading has no outlet or transformer. Same text
  // as core, with the pseudonym in place of the username.
  api.modifyClass(
    "component:post",
    (Superclass) =>
      class extends Superclass {
        get a11yHeadingText() {
          const post = this.args.post;
          if (!masked(post)) {
            return super.a11yHeadingText;
          }
          const date =
            this.a11y.autoUpdatingRelativeDateRef && post.displayDate
              ? relativeAge(new Date(post.displayDate), {
                  format: "medium-with-ago-and-on",
                  wrapInSpan: false,
                })
              : "";
          return i18n("post.accessible_heading", {
            username: pseudonym(post.ui_anonymous_author?.number, i18n),
            date,
          });
        }
      }
  );

  // Core re-renders quote titles after decorators run, so the label lives on
  // the cooked element as a CSS custom property inherited by every title.
  api.decorateCookedElement(
    (element, helper) => {
      if (!masked(helper?.model ?? helper?.getModel?.())) {
        return;
      }
      element.classList.add("ui-anonymous-cooked");
      element.style.setProperty(
        QUOTE_LABEL_VAR,
        JSON.stringify(i18n("ui_anonymous_categories.quote"))
      );
      return () => {
        element.classList.remove("ui-anonymous-cooked");
        element.style.removeProperty(QUOTE_LABEL_VAR);
      };
    },
    { onlyStream: true }
  );
});
