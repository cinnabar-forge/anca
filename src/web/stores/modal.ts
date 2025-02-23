import { type Writable, writable } from "svelte/store";
import type { ModalState } from "../types";

export const isModalOpen = writable(false);
export const modalState: Writable<ModalState<any, any> | null> = writable(null);

export function openModal<T = void, R = void>(
  contentComponent: ModalState<T, R>
) {
  if (contentComponent.onSuccess == null) {
    contentComponent.onSuccess = () => {
      closeModal();
    };
  }
  console.log("openModal", contentComponent);
  modalState.set(contentComponent);
  isModalOpen.set(true);
}

export function closeModal() {
  isModalOpen.set(false);
  modalState.set(null);
}
