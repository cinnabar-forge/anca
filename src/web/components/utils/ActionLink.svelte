<script lang="ts">
export let callback: () => void;
export let label: string;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<span class="local-link" on:click|preventDefault={callback}>{label}</span>
