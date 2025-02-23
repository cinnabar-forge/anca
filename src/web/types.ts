export type ContentPage = "hello";

export type ContentSlug = number | `${number}-${string}` | string;

export class ContentState {
  page?: ContentPage;
  slug?: ContentSlug;
}

export class Pagination {
  page: number;
  pages: number;
  left: boolean;
  right: boolean;
  fatSelection: boolean;
  pageList: number[];
}

export class ContextMenuItem {
  id?: string;
  name?: string;
  // biome-ignore lint/suspicious/noConfusingVoidType: TODO
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  callback?: () => Promise<any> | null | void;
  updateCallback?: AnyPromiseFunction;
  header?: boolean;
  separator?: boolean;
}

export interface ModalState<T = void, R = void> {
  component: any;
  fixedSize?: { width: number; height: number };
  params?: T;
  onOpen?: () => void;
  onSuccess?: (data?: R) => any;
  onClose?: () => void;
}

export type AnyPromiseFunction = (promise: Promise<any>) => void;
