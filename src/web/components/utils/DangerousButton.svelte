<script lang="ts">
let toggle = false;
export let action: () => any;
export let caption: string;
</script>

<button
  on:click={() => {
    toggle = !toggle;
  }}>{toggle ? "Hide" : "Show"} danger zone</button
>
{#if toggle}
  <button class="highlight bad" on:click={action}>{caption}</button>
{/if}
