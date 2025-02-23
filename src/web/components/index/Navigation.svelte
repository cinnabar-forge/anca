<script context="module" lang="ts">
  import {
    authorized,
    fetchInstanceInfo,
    getAuthUrl,
    instanceInfo,
    ping,
  } from "../../stores/auth";
  import {
    getUrl,
    updateContentState,
  } from "../../stores/content";
</script>

<script lang="ts">
  fetchInstanceInfo();

  $: {
    if ($authorized == null) {
      ping();
    }
  }
</script>

<nav>
  <a
    class="element ellipsis"
    href={getUrl("hello")}
    on:click|preventDefault={() => {
      updateContentState("hello");
    }}
  >
    {#if $instanceInfo != null && $instanceInfo.name != null}
      {$instanceInfo.name}
    {/if}
  </a>
  <div class="element ellipsis">
    {#if $authorized != null}
      {$authorized.name}
    {:else}
      <a href={getAuthUrl()}>Login</a>
    {/if}
  </div>
</nav>

<style>
  nav {
    z-index: 20;
    padding: 0.5em 0;
    position: fixed;
    width: 100%;
    top: 0px;
    height: 2em;
    max-height: 2em;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    font-family: "oswald-regular", Inter, Avenir, Helvetica, Arial, sans-serif;
    background-color: #f2f2f2;
  }

  .element {
    color: #333;
    margin: 0.5em 1em;
    text-align: center;
    background: none;
    width: 10em;
    height: 1.25em;
    padding: 0.2em;
    margin: 0.1em;
    font-size: 0.9em;
    max-width: 12em;
  }

  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (prefers-color-scheme: dark) {
    nav {
      background-color: #333;
    }
    .element {
      color: #f2f2f2;
    }
  }

  @media (max-width: 420px) {
    .element {
      width: 45%;
    }
  }
</style>
