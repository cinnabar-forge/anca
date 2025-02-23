import { type Writable, writable } from "svelte/store";
import type { ContextMenuItem } from "../types";

export const contextMenuList: Writable<ContextMenuItem[]> = writable([]);

let contextsDict: Record<
  string,
  { items: ContextMenuItem[]; ignoreParents?: boolean }
> = {};

export function getContextId(...parts: any[]): string {
  return parts.join("-");
}

export function clearAllContextMenus(): void {
  contextsDict = {};
}

export function registerIdContextMenuItems(
  id: string,
  items: ContextMenuItem[],
  ignoreParents?: boolean
): void {
  // console.log("registerIdContextMenuItems", id);
  contextsDict[id] = {
    items,
    ignoreParents
  };
}

function hasHtmlElementItems(element: Element): boolean {
  return element.id != null && contextsDict[element.id] != null;
}

export function updateContextMenu(clickedElement: Element): void {
  const elements = [];
  for (
    let element: Element | null = clickedElement;
    element != null;
    element = element.parentElement
  ) {
    if (hasHtmlElementItems(element)) {
      elements.push(element);
      if (contextsDict[element.id].ignoreParents === true) {
        break;
      }
    }
  }

  const items: ContextMenuItem[] = [];

  const itemPresented: any = {};

  elements.forEach((element) => {
    contextsDict[element.id].items.forEach((item) => {
      if (item.id == null || itemPresented[item.id] == null) {
        if (item.id != null && itemPresented[item.id] == null) {
          itemPresented[item.id] = true;
        }
        items.push(item);
      }
    });

    items.push({ separator: true });
  });
  if (elements.length > 0) {
    items.pop();
  }

  contextMenuList.set(items);
}
