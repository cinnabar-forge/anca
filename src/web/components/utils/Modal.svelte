<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { closeModal, modalState } from "../../stores/modal";

// Close modal on Escape key press
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    closeModal();
  }
};

// Add event listener for Escape key
onMount(() => {
  window.addEventListener("keydown", handleKeydown);
});

// Cleanup event listener
onDestroy(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="backdrop" on:click|self={closeModal}>
  <div class="modal">
    {#if $modalState}
      <svelte:component
        this={$modalState.component}
        params={$modalState.params}
        onSuccess={$modalState.onSuccess}
      />
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.25);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    background-color: #e7e7e7;
    color: #161616;
    border: 1px #808080 solid;
    padding: 0.5em;
    max-width: 90%;
    max-height: 90%;
    overflow: auto;
  }

  @media (prefers-color-scheme: dark) {
    .modal {
      background-color: #161616;
      color: #e7e7e7;
    }
  }
</style>
