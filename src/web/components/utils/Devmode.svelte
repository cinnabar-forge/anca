<script context="module" lang="ts">
import { isProduction } from "../../stores/api";
</script>

{#if !$isProduction}
  <p class="ment">⚠️ <b>DEVELOPMENT MODE</b> ⚠️</p>
{/if}

<style>
  .ment {
    user-select: none;
    /* background-color: #fc9f27; */
    background-color: #df3d3d;
    /* color: #363333; */
    color: #ffffff;
    padding: 0.4em;
    border: 0.15em #363333 solid;
    font-family: "oswald-regular", Inter, Avenir, Helvetica, Arial, sans-serif;
    text-align: center;
  }
</style>
