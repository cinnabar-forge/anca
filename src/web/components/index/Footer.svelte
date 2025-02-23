<script context="module" lang="ts">
import { CINNABAR_PROJECT_VERSION } from "../../../shared/cinnabar";
import Devmode from "../utils/Devmode.svelte";
</script>

<div>
  <Devmode />
</div>
<div>
  <span class="anca font-oswald"
    >Anca <small>v{CINNABAR_PROJECT_VERSION}</small></span
  >
  by
  <a href="https://cinnabarforge.com">Cinnabar Forge</a> © 2024-2025
</div>

<style>
  div {
    text-align: center;
    margin: 1em 0;
  }

  a {
    font-weight: bold;
  }

  .anca {
    color: #76a022;
    background-color: #e9e9e9;
    font-weight: bold;
    padding: 0.25em;
  }

  @media (prefers-color-scheme: dark) {
    .anca {
      color: #adff2f;
      background: none;
    }
  }
</style>
