<script lang="ts">
export let text: string;
</script>

<p class="warning">⚠️{text}</p>

<style>
  .warning {
    user-select: none;
    background-color: rgb(224, 190, 36);
    color: #000000;
    padding: 0.4em;
    border: rgb(0, 0, 0) #363333 solid;
    font-family: "oswald-regular", Inter, Avenir, Helvetica, Arial, sans-serif;
    text-align: center;
  }
</style>
