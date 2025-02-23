<script lang="ts">
export let title: string;

$: {
  document.title = `${title} — Anca`;
}
</script>

<header>
  <h1 id="page-header">{title}</h1>
  <div class="actions">
    <slot />
  </div>
</header>

<style>
  header,
  .actions {
    padding: 0;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    box-shadow: 0 0.1em #a2a9b1;
    align-items: flex-end;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  header h1 {
    margin: 0;
    flex-grow: 1;
    padding: 0 0 0.1em;
    font-size: 1.5em;
  }
</style>
