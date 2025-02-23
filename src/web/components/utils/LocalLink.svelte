<script lang="ts" context="module">
import { updateContentState } from "../../stores/content";
import { getUrl } from "../../stores/content";
import type { ContentPage } from "../../types";
</script>

<script lang="ts">
  export let page: ContentPage;
  export let slug: string | undefined = undefined;
  export let label: string;
</script>

<a
  class="local-link"
  href={getUrl(page, slug)}
  on:click|preventDefault={() => {
    updateContentState(page, slug);
  }}>{label}</a
>
