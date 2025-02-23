<script context="module" lang="ts">
import { contentState, updateWorkplaceFromUri } from "../../stores/content";
import { isModalOpen } from "../../stores/modal";
import ContextMenu from "../utils/ContextMenu.svelte";
import Devmode from "../utils/Devmode.svelte";
import LoadingOverlay from "../utils/LoadingOverlay.svelte";
import Modal from "../utils/Modal.svelte";
</script>

<script lang="ts">
  updateWorkplaceFromUri(window.location.pathname, true);
</script>

<Devmode />
{#if $contentState.page === "hello"}
  <p>Hello</p>
{/if}
{#if $isModalOpen}
  <Modal />
{/if}
<ContextMenu />
<LoadingOverlay />
