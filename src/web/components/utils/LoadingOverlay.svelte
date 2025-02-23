<script lang="ts">
import { clearProgress, loadingStore } from "../../stores/load";
// @ts-ignore
import LoadingBlob from "./LoadingBlob.svelte";

// Function to close the overlay
function closeOverlay() {
  clearProgress();
}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if $loadingStore.active}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="loading-info"
    class:error={$loadingStore.errors.length > 0}
    on:click={closeOverlay}
  >
    {#if $loadingStore.isLoading}
      <div class="loading-messages">
        <span class="loading-blob"><LoadingBlob /></span>
        <span class="loading-text">
          Loading: ({$loadingStore.resolvedPromises}/{$loadingStore.totalPromises})
        </span>
      </div>
    {/if}
    {#if $loadingStore.errors.length > 0}
      <div class="error-messages">
        {#each $loadingStore.errors as error}
          <div class="error">Error: {error}</div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .loading-info {
    font-size: 12px;
    background-color: #161616;
    color: #ccc;
    position: fixed;
    bottom: 1em;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.4em;
    border: 1px solid #ccc;
    display: flex;
    flex-flow: column;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    cursor: pointer;
  }

  .loading-messages {
    display: flex;
    flex-flow: row;
    align-items: center;
    justify-content: center;
  }

  .loading-info.error {
    background-color: #ff6b6b;
    color: #fff;
  }

  .loading-blob {
    width: 2em;
    height: 2em;
  }

  .loading-text {
    white-space: nowrap;
  }

  .error-messages {
    font-size: 10px;
    color: #fff;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 0.2em 0.5em;
    border-radius: 4px;
  }

  .error {
    margin: 0.2em 0;
  }
</style>
