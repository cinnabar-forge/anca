import { type Writable, writable } from "svelte/store";
import { type ContentPage, type ContentSlug, ContentState } from "../types";
import { clearAllContextMenus } from "./contextMenu";

export const refreshRequestCount: Writable<number> = writable(0);
export const contentState: Writable<ContentState> = writable();
export const modalErrorText: Writable<string> = writable();

addEventListener("popstate", (_event: PopStateEvent) => {
  updateWorkplaceFromUri(window.location.pathname);
});

export function getUrl(page: ContentPage, slug?: ContentSlug): string {
  let url = "";

  switch (page) {
    case "hello":
      url = `/hello`;
      break;
    default:
      url = `/${page}`;
      break;
  }

  return url;
}

export function updateContentState(
  page: ContentPage,
  slug?: ContentSlug,
  newTab?: true
): void {
  const url = getUrl(page, slug);

  if (newTab === true) {
    window.open(url, "_blank");
    return;
  }
  if (window.location.pathname !== url) {
    window.history.pushState(`anca_${Date.now()}`, "", url);
    updateWorkplaceFromUri(window.location.pathname);
  }
  clearAllContextMenus();
}

export function updateWorkplaceFromUri(
  uri: string,
  replaceHistory?: boolean
): void {
  const splittedUri: string[] = uri.split("/");

  const newContentState = new ContentState();

  if (splittedUri[1] === "" || splittedUri[1] === "hello") {
    newContentState.page = "hello";
  }

  if (replaceHistory === true) {
    window.history.replaceState(newContentState, "");
  }

  contentState.set(newContentState);

  console.log("newContentState", newContentState);
}
