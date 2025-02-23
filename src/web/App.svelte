<script context="module" lang="ts">
import Content from "./components/index/Content.svelte";
import Footer from "./components/index/Footer.svelte";
import Navigation from "./components/index/Navigation.svelte";
import { isProduction } from "./stores/api";
import { authorized } from "./stores/auth";
</script>

<script lang="ts">
  isProduction.set(import.meta.env.PROD);
</script>

<Navigation />

<div class="main">
  <div class="content">
    {#if $authorized != null}
      <Content />
    {/if}
  </div>
  <div class="footer">
    <Footer />
  </div>
</div>

<style>
  .main {
    max-width: 60rem;
    margin-left: auto;
    margin-right: auto;
    padding: 0 1em;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .content {
    margin-top: 3em;
    flex-grow: 1;
  }

  .footer {
    margin-top: auto;
  }
</style>
