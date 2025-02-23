<!--
  Based on 'Right Click Context Menu' Svelte REPL by Duken Marga (GitHub @dukenmarga)
  Source: https://svelte.dev/repl/6fb90919e24942b2b47d9ad154386b0c?version=3.49.0
-->
<script lang="ts" context="module">
import { contextMenuList, updateContextMenu } from "../../stores/contextMenu";
</script>

<script lang="ts">
  let pos = { x: 0, y: 0 };
  let menu = { w: 0, h: 0 };
  let browser = { w: 0, h: 0 };
  let showMenu = false;

  function rightClickContextMenu(e: any): void {
    updateContextMenu(e.target);
    if ($contextMenuList.length === 0) {
      return;
    }
    e.preventDefault();
    showMenu = true;
    browser = {
      w: window.innerWidth,
      h: window.innerHeight
    };
    pos = {
      x: e.pageX,
      y: e.pageY
    };
    if (browser.h - pos.y < menu.h) pos.y = pos.y - menu.h;
    if (browser.w - pos.x < menu.w) pos.x = pos.x - menu.w;
  }
  function onPageClick(e: any): void {
    showMenu = false;
  }
  function getContextMenuDimension(node: any): void {
    const height = node.offsetHeight;
    const width = node.offsetWidth;
    menu = {
      h: height,
      w: width
    };
  }
</script>

{#if showMenu}
  <div
    use:getContextMenuDimension
    class="navbar"
    id="navbar"
    style="position: absolute; top:{pos.y}px; left:{pos.x}px"
  >
    {#each $contextMenuList as item}
      {#if item.separator}
        <hr />
      {:else if item.header}
        <div class="item header">
          {item.name}
        </div>
      {:else}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="item clickable"
          on:click={(e) => {
            if (item.callback != null) {
              const promise = item.callback();
              if (item.updateCallback != null && promise != null) {
                item.updateCallback(promise);
              }
            }
            onPageClick(e);
          }}
        >
          {item.name}
        </div>
      {/if}
    {/each}
  </div>
{/if}

<svelte:window on:contextmenu={rightClickContextMenu} on:click={onPageClick} />

<style>
  .navbar {
    z-index: 30;
    display: inline-flex;
    border: 1px #999 solid;
    /* width: 10em; */
    background-color: #fff;
    overflow: hidden;
    flex-direction: column;
    user-select: none;
  }
  .item {
    display: block;
    font-size: 0.75em;
    color: #222;
    height: 1.5em;
    text-align: left;
    background-color: #fff;
    padding: 0.15em 0.3em;
  }
  .item.clickable:hover {
    color: #000;
    background-color: #eee;
    cursor: pointer;
  }
  .item.header {
    display: block;
    font-size: 0.9em;
    text-align: center;
    background-color: #cce2a1;
  }
  hr {
    border: none;
    border-bottom: 1px solid #ccc;
    margin: 0;
  }
</style>
