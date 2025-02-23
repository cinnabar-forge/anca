import { writable } from "svelte/store";

export const loadingStore = writable({
  active: false,
  isLoading: false,
  totalPromises: 0,
  resolvedPromises: 0,
  errors: [] as string[]
});

const promiseSet = new Set<Promise<any>>();

export function addPromise(promise: Promise<any>) {
  promiseSet.add(promise);

  loadingStore.update((state) => ({
    ...state,
    active: true,
    isLoading: true,
    totalPromises: state.totalPromises + 1
  }));

  promise
    .then(() => {
      loadingStore.update((state) => ({
        ...state,
        resolvedPromises: state.resolvedPromises + 1
      }));
    })
    .catch((error) => {
      loadingStore.update((state) => ({
        ...state,
        resolvedPromises: state.resolvedPromises + 1,
        errors: [...state.errors, error.message || "An error occurred"]
      }));
    })
    .finally(() => {
      promiseSet.delete(promise);

      if (promiseSet.size === 0) {
        loadingStore.update((state) => {
          const hasErrors = state.errors.length > 0;

          return hasErrors
            ? {
                ...state,
                active: true,
                isLoading: false
              }
            : {
                active: false,
                isLoading: false,
                totalPromises: 0,
                resolvedPromises: 0,
                errors: []
              };
        });
      }
    });
}

export function clearProgress() {
  promiseSet.clear();
  loadingStore.set({
    active: false,
    isLoading: false,
    totalPromises: 0,
    resolvedPromises: 0,
    errors: []
  });
}
